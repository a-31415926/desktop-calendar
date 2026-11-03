import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const startup=readFileSync('src-tauri/src/app_runtime/windows/startup.rs','utf8');
const popup=readFileSync('src-tauri/src/window_manager/windows/taskbar_popup.rs','utf8');
test('taskbar autostart preloads the popup while visibility remains opt-in',()=>{
 assert.match(startup,/let popup_arcs = if taskbar_widget_enabled \|\| should_show_startup_popup/);
 assert.doesNotMatch(startup,/if !should_show_startup_popup\s*\{\s*return/);
 assert.match(startup,/fn queue_startup_show[\s\S]*?if show \{[\s\S]*?wm.set_startup_popup_persistence/);
 assert.equal((startup.match(/queue_startup_show\(wm, should_show_startup_popup/g)||[]).length,3);
 assert.match(popup,/\.visible\(false\)/);assert.match(popup,/\.focused\(false\)/);
});
test('a click during preload waits for renderer readiness and early readiness is replayed after attach',()=>{
 assert.equal((popup.match(/let has_live_popup_window = Self::popup_is_ready\(\)/g)||[]).length,2);
 assert.match(popup,/fn on_popup_ready[\s\S]*?POPUP_WEBVIEW_READY.store\(true/);
 assert.match(startup,/if CalendarWindowManager::popup_is_ready\(\) \{ let _=wm.on_popup_ready\(\)/);
});

