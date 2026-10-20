import {createContext,useContext} from 'react';
import type {WeatherData} from './model.ts';
export const CalendarWeatherContext=createContext<WeatherData|null>(null);
export const useCalendarWeather=()=>useContext(CalendarWeatherContext);
