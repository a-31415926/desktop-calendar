import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('popup dismissal never uses focus loss, mouse movement or last-input polling',()=>{
 const popup=readFileSync('src-tauri/src/window_manager/windows/taskbar_popup.rs','utf8');
 assert.doesNotMatch(popup,/GetLastInputInfo|Focused\(false\)|input_baseline|GetForegroundWindow/);
 assert.match(popup,/WindowFromPoint/);
 assert.match(popup,/dismiss_for_press/);
});
test('outside mouse down is forwarded without swallowing it and clock release never toggles',()=>{
 const hook=readFileSync('src-tauri/src/windows_hook/mouse_hook.rs','utf8');
 assert.match(hook,/if is_down \{[\s\S]*?in_clock_area: true/);
 assert.match(hook,/if is_down \{[\s\S]*?in_clock_area:false[\s\S]*?CallNextHookEx/);
 assert.match(hook,/pointer_phase\(msg\)/);
});

