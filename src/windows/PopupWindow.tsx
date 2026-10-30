import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  type CSSProperties,
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {popupTransitions} from '../utils/popupTransitions.ts';
import CalendarView from '../components/calendar/CalendarView.tsx';
import { WINDOW_RADIUS } from '../constants/window.ts';
import { useWindowCornerMask } from '../hooks/useWindowCornerMask.ts';
import { useConfigSync } from '../sync/configStore.ts';
import { isWindows } from '../utils/platform.ts';
import {
  popupHideRequestEvent,
  type PopupHideRequestDetail,
} from '../utils/tauriUtils.ts';

// V11 保留 V10 已验证最舒服的 V7 风格展开机制。
// 仅修关闭阶段：整个弹窗表面同步淡出，避免内容收走后留下原生窗口空壳。
const POPUP_ENTER_MS = 250;
const POPUP_EXIT_MS = 167;
const POPUP_SURFACE_EXIT_FADE_MS = 130;
const CONTENT_ENTER_MS = 167;
const CONTENT_EXIT_MS = 83;
const CONTENT_ENTER_DELAY_MS = 42;

const PopupWindow = (): ReactElement => {
  const readyCalled = useRef(false);
  const { data } = useConfigSync();
  const { isWindowsEffect: windowTransparency, macosEffect: windowEffect } = data;
  const [popupVisible, setPopupVisible] = useState(false);
  const transition = useRef<ReturnType<typeof popupTransitions>|null>(null);
  if (!transition.current) transition.current=popupTransitions({
    visible:setPopupVisible,
    schedule:(fn,ms)=>setTimeout(fn,ms),
    cancel:handle=>clearTimeout(handle as ReturnType<typeof setTimeout>),
    requestClose:epoch=>invoke('popup_request_close',{epoch}),
    finishHide:epoch=>invoke<boolean>('popup_finish_hide',{epoch}),
    afterHide:epoch=>invoke('open_main_window',{popupEpoch:epoch}),
    error:error=>console.error('popup transition failed',error),
  });
  const clearPendingTransition=useCallback(()=>transition.current!.dispose(),[]);
  const startEnter=useCallback((epoch:number)=>transition.current!.enter(epoch),[]);
  const startExit=useCallback((after?:PopupHideRequestDetail['after'])=>{
    transition.current!.exit(transition.current!.current(),after);
  },[]);

  useEffect(() => {
    if (isWindows) {
      void getCurrentWindow().setShadow(false);
    }
  }, []);

  // 任务栏 Flyout 不应该出现浏览器滚动条。真实内容尺寸由 useTauriCalendarResize 负责。
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousRootOverflow = root?.style.overflow ?? '';

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (root) root.style.overflow = 'hidden';

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      if (root) root.style.overflow = previousRootOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unlistenShow: (() => void) | undefined;
    let unlistenHide: (() => void) | undefined;

    const handleBrowserHideRequest = (event: Event): void => {
      const detail = (event as CustomEvent<PopupHideRequestDetail>).detail;
      if(detail)detail.handled=true;
      startExit(detail?.after);
    };

    window.addEventListener(popupHideRequestEvent, handleBrowserHideRequest);

    void (async () => {
      try {
        const removeShow = await listen<number>('calendar-popup-show', event => startEnter(event.payload));
        if (cancelled) removeShow();
        else unlistenShow = removeShow;

        const removeHide = await listen<number>('calendar-popup-hide', event => transition.current!.exit(event.payload));
        if (cancelled) removeHide();
        else unlistenHide = removeHide;
      } catch (error) {
        console.error('popup transition listener failed', error);
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener(popupHideRequestEvent, handleBrowserHideRequest);
      unlistenShow?.();
      unlistenHide?.();
      clearPendingTransition();
    };
  }, [clearPendingTransition, startEnter, startExit]);

  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(event.key!=='Escape'||event.defaultPrevented)return;
      if(document.querySelector('[role="dialog"],.ant-dropdown:not(.ant-dropdown-hidden)'))return;
      event.preventDefault();startExit();
    };
    window.addEventListener('keydown',key);
    const pending=getCurrentWindow().onCloseRequested(event=>{event.preventDefault();startExit();});
    return ()=>{window.removeEventListener('keydown',key);void pending.then(stop=>stop());};
  },[startExit]);

  useEffect(() => {
    if (readyCalled.current) return;

    const appWindow = getCurrentWindow();
    let unlistenResize: (() => void) | undefined;
    let resizeObserver: ResizeObserver | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const fireReady = (): void => {
      if (cancelled || readyCalled.current) return;
      readyCalled.current = true;
      if (fallbackTimer !== undefined) {
        clearTimeout(fallbackTimer);
        fallbackTimer = undefined;
      }
      unlistenResize?.();
      resizeObserver?.disconnect();
      void invoke('popup_ready').then(()=>invoke<{epoch:number;visible:boolean}>('popup_snapshot'))
        .then(snapshot=>{if(snapshot.visible&&transition.current!.current()===0)startEnter(snapshot.epoch);}).catch(console.error);
    };

    const tryFireWhenSized = async (): Promise<void> => {
      if (cancelled || readyCalled.current) return;
      try {
        const size = await appWindow.innerSize();
        if (size.width > 0 && size.height > 100) {
          fireReady();
        }
      } catch {
        // ignore
      }
    };

    void (async () => {
      try {
        unlistenResize = await appWindow.onResized(() => {
          void tryFireWhenSized();
        });
        if (cancelled) {
          unlistenResize();
        }
      } catch {
        // ignore
      }
    })();

    const root = document.getElementById('root');
    if (root) {
      resizeObserver = new ResizeObserver(() => {
        void tryFireWhenSized();
      });
      resizeObserver.observe(root);
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void tryFireWhenSized();
      });
    });

    fallbackTimer = setTimeout(() => {
      fireReady();
    }, 450);

    return () => {
      cancelled = true;
      if (fallbackTimer !== undefined) {
        clearTimeout(fallbackTimer);
      }
      unlistenResize?.();
      resizeObserver?.disconnect();
    };
  }, [startEnter]);

  useWindowCornerMask();

  useEffect(() => {
    invoke('set_macos_vibrancy', {
      enabled: windowTransparency,
      effect: windowEffect,
    }).catch(console.error);
  }, [windowEffect, windowTransparency]);

  const transitionStyle: CSSProperties = {
    // V10 的水平直线裁切继续保留；V11 只在退出时让整个表面同步淡掉。
    clipPath: popupVisible ? 'inset(0% 0 0 0)' : 'inset(100% 0 0 0)',
    opacity: popupVisible ? 1 : 0,
    transition: popupVisible
      ? `clip-path ${POPUP_ENTER_MS}ms cubic-bezier(0, 0, 0, 1), opacity 0ms linear`
      : `clip-path ${POPUP_EXIT_MS}ms cubic-bezier(1, 0, 1, 1), opacity ${POPUP_SURFACE_EXIT_FADE_MS}ms cubic-bezier(0.4, 0, 1, 1)`,
    transformOrigin: 'bottom right',
    willChange: 'clip-path, opacity',
    overflow: 'hidden',
    background: 'transparent',
    borderRadius: `${WINDOW_RADIUS}px`,
    pointerEvents: popupVisible ? 'auto' : 'none',
  };

  const calendarStyle = {
    '--calendar-radius': `${WINDOW_RADIUS}px`,
    '--calendar-shadow': 'none',
    '--calendar-content-opacity': popupVisible ? '1' : '0',
    '--calendar-content-fade-duration': popupVisible
      ? `${CONTENT_ENTER_MS}ms`
      : `${CONTENT_EXIT_MS}ms`,
    '--calendar-content-fade-delay': popupVisible ? `${CONTENT_ENTER_DELAY_MS}ms` : '0ms',
    '--calendar-content-fade-easing': popupVisible
      ? 'cubic-bezier(0, 0, 0, 1)'
      : 'cubic-bezier(1, 0, 1, 1)',
  } as CSSProperties;

  return (
    <div style={transitionStyle}>
      <CalendarView
        transparent={isWindows ? windowTransparency : true}
        backgroundOpacity={windowTransparency ? 72 : 100}
        style={calendarStyle}
      />
    </div>
  );
};

export default PopupWindow;

