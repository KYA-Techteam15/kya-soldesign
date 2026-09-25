//! Mises à jour par canal (spec 012, FR-E1).
//!
//! Le module JavaScript du greffon ne sait interroger que les adresses de la configuration : le
//! canal « beta » demande d'en changer au moment de la recherche. L'hôte expose donc deux
//! commandes, `check_update(channel)` puis `install_update()`, qui s'appuient sur le greffon.
//!
//! - canal `stable` : les adresses de `plugins.updater.endpoints` (configuration de publication) ;
//! - canal `beta` : l'adresse fournie à la compilation par `KSD_UPDATER_BETA_ENDPOINT`. Absente,
//!   le canal n'est pas proposé.
//!
//! La signature de chaque paquet est vérifiée par le greffon avec la clé publique embarquée.

use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, State, Url};
use tauri_plugin_updater::{Update, UpdaterExt};

/// Adresse du flux beta, figée à la compilation.
const BETA_ENDPOINT: Option<&str> = option_env!("KSD_UPDATER_BETA_ENDPOINT");

/// Mise à jour trouvée par la dernière recherche, en attente d'installation.
#[derive(Default)]
pub struct PendingUpdate(Mutex<Option<Update>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    version: String,
    current_version: String,
    notes: Option<String>,
    date: Option<String>,
}

/// Canaux proposés par cette version.
#[tauri::command]
pub fn update_channels() -> Vec<&'static str> {
    if BETA_ENDPOINT.is_some_and(|endpoint| !endpoint.trim().is_empty()) {
        vec!["stable", "beta"]
    } else {
        vec!["stable"]
    }
}

/// Recherche une mise à jour sur le canal demandé ; `None` si le poste est à jour.
#[tauri::command]
pub async fn check_update(app: AppHandle, pending: State<'_, PendingUpdate>, channel: String) -> Result<Option<UpdateInfo>, String> {
    let mut builder = app.updater_builder();
    if channel == "beta" {
        let endpoint = BETA_ENDPOINT.filter(|value| !value.trim().is_empty()).ok_or("UPDATE_CHANNEL_UNAVAILABLE")?;
        let url = Url::parse(endpoint.trim()).map_err(|error| error.to_string())?;
        builder = builder.endpoints(vec![url]).map_err(|error| error.to_string())?;
    }
    let update = builder.build().map_err(|error| error.to_string())?.check().await.map_err(|error| error.to_string())?;
    let info = update.as_ref().map(|found| UpdateInfo {
        version: found.version.clone(),
        current_version: found.current_version.clone(),
        notes: found.body.clone(),
        date: found.date.map(|date| date.to_string()),
    });
    *pending.0.lock().map_err(|error| error.to_string())? = update;
    Ok(info)
}

/// Télécharge et installe la mise à jour trouvée. Sous Windows, l'installateur (mode `passive`)
/// prend la main et l'application se ferme ; ailleurs, l'interface relance l'application.
#[tauri::command]
pub async fn install_update(pending: State<'_, PendingUpdate>) -> Result<(), String> {
    let update = pending.0.lock().map_err(|error| error.to_string())?.take().ok_or("UPDATE_NOT_CHECKED")?;
    log::info!("installation de la mise à jour {}", update.version);
    update.download_and_install(|_, _| {}, || {}).await.map_err(|error| error.to_string())
}
