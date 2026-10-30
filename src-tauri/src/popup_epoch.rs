use std::sync::atomic::{AtomicU64, Ordering};

pub struct PopupEpoch(AtomicU64);
impl PopupEpoch {
    pub const fn new() -> Self { Self(AtomicU64::new(0)) }
    pub fn next(&self) -> u64 { self.0.fetch_add(1, Ordering::SeqCst) + 1 }
    pub fn current(&self) -> u64 { self.0.load(Ordering::SeqCst) }
    pub fn accepts(&self, epoch: u64) -> bool { self.current() == epoch }
}
pub static POPUP_EPOCH: PopupEpoch = PopupEpoch::new();

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn delayed_close_cannot_hide_a_reopened_window() {
        let state=PopupEpoch::new();
        let first=state.next();
        assert!(state.accepts(first));
        let reopened=state.next();
        assert!(!state.accepts(first));
        assert!(state.accepts(reopened));
    }
    #[test]
    fn delayed_callbacks_across_many_show_hide_cycles_stay_invalid() {
        let state=PopupEpoch::new();
        let pending:Vec<_>=(0..100).map(|_|state.next()).collect();
        for old in &pending[..99] { assert!(!state.accepts(*old)); }
        assert!(state.accepts(pending[99]));
    }
}

