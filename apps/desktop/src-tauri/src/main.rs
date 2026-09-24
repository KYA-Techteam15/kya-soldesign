// Pas de fenêtre console en version publiée sous Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    kya_soldesign_lib::run();
}
