use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

use tauri::{Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};

const SERVER_PORT: u16 = 38472;

struct ServerState(Mutex<Option<Child>>);

fn project_root() -> PathBuf {
  let cwd = std::env::current_dir().expect("failed to get current directory");
  if cwd.ends_with("src-tauri") {
    cwd.parent()
      .expect("project root should exist")
      .to_path_buf()
  } else {
    cwd
  }
}

fn bundled_paths() -> Result<(PathBuf, PathBuf, PathBuf), String> {
  let exe = std::env::current_exe().map_err(|e| e.to_string())?;
  let macos_dir = exe
    .parent()
    .ok_or_else(|| format!("missing MacOS directory for {}", exe.display()))?;
  let node_path = macos_dir.join("node");
  let bundle_root = macos_dir
    .parent()
    .ok_or_else(|| format!("missing Contents directory for {}", exe.display()))?
    .join("Resources")
    .join("resources");

  Ok((
    node_path,
    bundle_root.join("app-server"),
    bundle_root.join("client"),
  ))
}

fn wait_for_server(port: u16) -> Result<(), String> {
  let url = format!("http://127.0.0.1:{port}/api/health");
  for _ in 0..100 {
    if ureq::get(&url).call().is_ok() {
      return Ok(());
    }
    std::thread::sleep(Duration::from_millis(100));
  }
  Err("Server failed to start in time".into())
}

fn spawn_server() -> Result<Child, String> {
  let port = SERVER_PORT.to_string();

  if cfg!(debug_assertions) {
    let root = project_root();
    let server_dir = root.join("server");
    let client_dist = root.join("client/dist");

    Command::new("node")
      .current_dir(&server_dir)
      .arg("dist/index.js")
      .env("PORT", &port)
      .env("NODE_ENV", "production")
      .env("CLIENT_DIST", client_dist.to_string_lossy().as_ref())
      .stdout(Stdio::null())
      .stderr(Stdio::null())
      .spawn()
      .map_err(|e| format!("failed to start dev server: {e}"))
  } else {
    let (node_path, app_server_dir, client_dist) = bundled_paths()?;

    if !node_path.exists() {
      return Err(format!("Node runtime not found at {}", node_path.display()));
    }
    if !app_server_dir.exists() {
      return Err(format!(
        "Server bundle not found at {}",
        app_server_dir.display()
      ));
    }

    Command::new(&node_path)
      .current_dir(&app_server_dir)
      .arg("dist/index.js")
      .env("PORT", &port)
      .env("NODE_ENV", "production")
      .env("CLIENT_DIST", client_dist.to_string_lossy().as_ref())
      .stdout(Stdio::null())
      .stderr(Stdio::null())
      .spawn()
      .map_err(|e| format!("failed to start bundled server: {e}"))
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(ServerState(Mutex::new(None)))
    .setup(|app| {
      let child = spawn_server()?;
      wait_for_server(SERVER_PORT)?;

      *app.state::<ServerState>().0.lock().unwrap() = Some(child);

      let url = format!("http://127.0.0.1:{SERVER_PORT}");
      WebviewWindowBuilder::new(
        app,
        "main",
        WebviewUrl::External(url.parse().expect("valid server url")),
      )
      .title("SimpleDB")
      .inner_size(1280.0, 800.0)
      .min_inner_size(800.0, 600.0)
      .build()?;

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app, event| {
      if let RunEvent::Exit = event {
        if let Some(state) = app.try_state::<ServerState>() {
          if let Some(mut child) = state.0.lock().unwrap().take() {
            let _ = child.kill();
          }
        }
      }
    });
}
