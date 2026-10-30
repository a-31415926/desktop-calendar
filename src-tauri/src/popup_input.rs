#[derive(Debug, PartialEq)]
pub enum PointerPhase { Down, Up, Other }

// Windows mouse message values; no last-input time or foreground polling.
pub fn pointer_phase(message:u32) -> PointerPhase {
    match message {
        0x0201 | 0x0204 | 0x0207 => PointerPhase::Down,
        0x0202 | 0x0205 | 0x0208 => PointerPhase::Up,
        _ => PointerPhase::Other,
    }
}
pub fn dismiss_for_press(phase:PointerPhase, visible:bool, pinned:bool, menu:bool, clock:bool, own_target:bool) -> bool {
    phase==PointerPhase::Down && visible && !pinned && !menu && !clock && !own_target
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn opening_press_release_movement_and_focus_changes_do_not_dismiss() {
        for message in [0x0201,0x0202,0x0200,0x0008] {
            assert!(!dismiss_for_press(pointer_phase(message),true,false,false,true,false));
        }
        // A release outside the clock after dragging/holding is still only a release.
        for message in [0x0202,0x0205,0x0208,0x0200,0x0008] {
            assert!(!dismiss_for_press(pointer_phase(message),true,false,false,false,false));
        }
    }
    #[test]
    fn a_separate_outside_press_dismisses_regardless_of_activation() {
        for message in [0x0201,0x0204,0x0207] {
            assert!(dismiss_for_press(pointer_phase(message),true,false,false,false,false));
            assert!(!dismiss_for_press(pointer_phase(message),true,false,false,false,true));
        }
    }
    #[test]
    fn menu_pinned_and_hidden_windows_remain_exempt() {
        assert!(!dismiss_for_press(PointerPhase::Down,true,true,false,false,false));
        assert!(!dismiss_for_press(PointerPhase::Down,true,false,true,false,false));
        assert!(!dismiss_for_press(PointerPhase::Down,false,false,false,false,false));
    }
}

