import React, { useState, type CSSProperties } from 'react';
import dayjs from 'dayjs';
import type {WeatherData} from '../../weather/model.ts';
import {CalendarWeatherContext} from '../../weather/CalendarWeatherContext.ts';
import '../../utils/calendar/setupDayjsCalendar.ts';
import { CalendarViewProvider } from '../../hooks/calender/CalendarViewContext.tsx';
import { useCalendarViewModel } from '../../hooks/calender/useCalendarViewModel.ts';
import { useCalendarAppearance } from '../../hooks/calender/useCalendarAppearance.ts';
import './calendarUsability.css';
import './calendarWide.css';
import CalendarFooter from './subs/CalendarFooter.tsx';
import CalendarWeather from './subs/CalendarWeather.tsx';
import CalendarHeader from './subs/CalendarHeader.tsx';
import CalendarMonthGrid from './subs/CalendarMonthGrid.tsx';
import CalendarMonthNav from './subs/CalendarMonthNav.tsx';

/** 主日历浮窗 / 桌面日历壳子的可配置项 */
export interface CalendarViewProps {
  /** 是否允许按住空白区域拖拽窗口。 */
  enableDrag?: boolean;
  /** 是否把标题区标记成 Tauri 原生拖拽区域。 */
  dragRegion?: boolean;
  /** 是否根据内容高度自动调整窗口尺寸。 */
  autoResizeWindow?: boolean;
  /** 是否启用透明背景模式。 */
  transparent?: boolean;
  /** 日历背景不透明度。 */
  backgroundOpacity?: number;
  /** 是否显示主题切换按钮。 */
  showThemeButton?: boolean;
  /** 是否显示置顶按钮。 */
  showPinButton?: boolean;
  /** 是否显示设置按钮。 */
  showSettingsButton?: boolean;
  /** 是否显示关闭/收起按钮。 */
  showCloseButton?: boolean;
  /** 传给日历根节点的额外内联样式。 */
  style?: CSSProperties;
}

/**
 * 日历界面根：挂载 view model 上下文，子区块组件各自从 context 读取数据。
 */
const CalendarView: React.FC<CalendarViewProps> = ({
  enableDrag = false,
  dragRegion = false,
  autoResizeWindow = true,
  transparent = true,
  backgroundOpacity = 100,
  showThemeButton = true,
  showPinButton = true,
  showSettingsButton = true,
  showCloseButton = true,
  style,
}) => {
  /** 聚合后的日历视图模型，供上下文与各子组件共享。 */
  const size = useCalendarAppearance();
  const [weather,setWeather]=useState<WeatherData|null>(null);
  const model = useCalendarViewModel({
    enableDrag,
    dragRegion,
    autoResizeWindow,
    transparent,
    backgroundOpacity,
    showThemeButton,
    showPinButton,
    showSettingsButton,
    showCloseButton,
    style,
  });

  return (
    <CalendarViewProvider value={model}>
      <CalendarWeatherContext.Provider value={weather}>
      <div {...model.rootProps} data-calendar-shell data-calendar-size={size} data-calendar-layout="wide">
        <header className="calendar-wide-header"><CalendarHeader /></header>
        <div className="calendar-wide-columns">
          <aside className="calendar-wide-weather" aria-label="天气与出行参考">
            <CalendarWeather selectedDate={dayjs()} onData={setWeather}>{null}</CalendarWeather>
          </aside>
          <main className="calendar-wide-calendar" aria-label="月历和今日宜忌">
            <CalendarMonthNav />
            <CalendarMonthGrid />
            <div data-calendar-footer data-no-month-scroll><CalendarFooter /></div>
          </main>
        </div>
      </div>
      </CalendarWeatherContext.Provider>
    </CalendarViewProvider>
  );
};

export default CalendarView;

