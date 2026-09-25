//! Hôte de bureau de KYA-SolDesign.
//!
//! L'application web reste l'unique autorité métier ; l'hôte ne fournit que la
//! plateforme : fenêtre unique, journal fichier, base SQLite et sa sauvegarde,
//! boîtes de dialogue natives, réseau vers les fournisseurs météo, ouverture des
//! fichiers `.ksd` et, quand elles sont configurées, les mises à jour.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_log::{RotationStrategy, Target, TargetKind};

#[cfg(feature = "updater")]
mod updates;

/// Nom de la base, identique à `PROJECT_DATABASE` côté interface.
const DATABASE_FILE: &str = "kya-sol-design.db";
/// Nombre de copies de sauvegarde conservées au démarrage.
const BACKUPS_KEPT: usize = 5;
/// Taille maximale d'un fichier projet ouvert depuis l'explorateur.
const MAX_PROJECT_FILE_BYTES: u64 = 64 * 1024 * 1024;

/// Premier argument de la ligne de commande qui désigne un projet `.ksd`.
fn project_file_argument(args: &[String]) -> Option<String> {
    args.iter()
        .skip(1)
        .find(|arg| Path::new(arg).extension().is_some_and(|ext| ext.eq_ignore_ascii_case("ksd")))
        .cloned()
}

/// Fichier `.ksd` passé au lancement (double clic dans l'explorateur).
#[tauri::command]
fn startup_project_file() -> Option<String> {
    project_file_argument(&std::env::args().collect::<Vec<_>>())
}

/// Lit un fichier projet choisi hors de l'application (association `.ksd`).
/// Seule l'extension `.ksd` est acceptée, et la taille est bornée.
#[tauri::command]
fn read_project_file(path: String) -> Result<String, String> {
    let path = PathBuf::from(path);
    if !path.extension().is_some_and(|ext| ext.eq_ignore_ascii_case("ksd")) {
        return Err("PROJECT_FILE_EXTENSION".into());
    }
    let size = fs::metadata(&path).map_err(|error| error.to_string())?.len();
    if size > MAX_PROJECT_FILE_BYTES {
        return Err("PROJECT_FILE_TOO_LARGE".into());
    }
    fs::read_to_string(&path).map_err(|error| error.to_string())
}

/// Extensions des documents que l'application exporte et peut ouvrir ensuite.
const EXPORTED_EXTENSIONS: [&str; 5] = ["docx", "pdf", "png", "svg", "xlsx"];

/// Ouvre, avec l'application par défaut, un document que l'utilisateur vient d'exporter.
///
/// La permission générique d'ouverture resterait trop large (tout le disque) : cette commande
/// n'accepte que les extensions de documents exportés et un fichier existant.
#[tauri::command]
fn open_exported_file(app: AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let target = PathBuf::from(&path);
    let allowed = target
        .extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| EXPORTED_EXTENSIONS.iter().any(|known| ext.eq_ignore_ascii_case(known)));
    if !allowed {
        return Err("EXPORTED_FILE_EXTENSION".into());
    }
    if !target.is_file() {
        return Err("EXPORTED_FILE_MISSING".into());
    }
    app.opener().open_path(path, None::<&str>).map_err(|error| error.to_string())
}

/// Copie la base de projets avant toute ouverture et garde les `BACKUPS_KEPT`
/// dernières copies. Un échec est journalisé sans empêcher le démarrage.
fn backup_database(app: &AppHandle) {
    let result = (|| -> std::io::Result<Option<PathBuf>> {
        let data = app.path().app_config_dir().map_err(std::io::Error::other)?;
        let database = data.join(DATABASE_FILE);
        if !database.exists() {
            return Ok(None);
        }
        let backups = data.join("backups");
        fs::create_dir_all(&backups)?;
        let stamp = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
        let target = backups.join(format!("kya-sol-design-{stamp}.db"));
        fs::copy(&database, &target)?;
        let mut copies: Vec<PathBuf> = fs::read_dir(&backups)?
            .filter_map(|entry| entry.ok().map(|e| e.path()))
            .filter(|path| path.extension().is_some_and(|ext| ext == "db"))
            .collect();
        copies.sort();
        while copies.len() > BACKUPS_KEPT {
            let oldest = copies.remove(0);
            let _ = fs::remove_file(oldest);
        }
        Ok(Some(target))
    })();
    match result {
        Ok(Some(target)) => log::info!("sauvegarde de la base : {}", target.display()),
        Ok(None) => log::info!("aucune base à sauvegarder (premier lancement)"),
        Err(error) => log::error!("sauvegarde de la base impossible : {error}"),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        // L'instance unique doit être enregistrée en premier.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            if let Some(path) = project_file_argument(&args) {
                let _ = app.emit("open-project-file", path);
            }
        }))
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([Target::new(TargetKind::LogDir { file_name: Some("kya-sol-design".into()) }), Target::new(TargetKind::Stdout)])
                .rotation_strategy(RotationStrategy::KeepSome(5))
                .max_file_size(2_000_000)
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init());

    #[cfg(feature = "updater")]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(updates::PendingUpdate::default())
        .invoke_handler(tauri::generate_handler![
            startup_project_file,
            read_project_file,
            open_exported_file,
            updates::update_channels,
            updates::check_update,
            updates::install_update
        ]);

    // Sans le module de mise à jour, les commandes n'existent pas : l'interface affiche
    // « mises à jour non configurées », jamais une fausse absence de mise à jour.
    #[cfg(not(feature = "updater"))]
    let builder = builder.invoke_handler(tauri::generate_handler![startup_project_file, read_project_file, open_exported_file]);

    builder
        .setup(|app| {
            log::info!("KYA-SolDesign {} démarre", app.package_info().version);
            backup_database(app.handle());
            // Les outils de développement ne sont pas exposés dans une version publiée.
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erreur au lancement de KYA-SolDesign");
}
