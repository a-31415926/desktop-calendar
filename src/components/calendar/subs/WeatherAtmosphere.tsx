const scenes = ['neutral', 'sun', 'cloud-sun', 'cloud', 'rain', 'storm', 'snow', 'fog'];
/** Keep scenes mounted so rapid date changes crossfade without an empty frame. */
export default function WeatherAtmosphere({scene}: {scene: string}) {
  return <div className="calendar-weather-atmosphere v15-atmosphere" aria-hidden="true">
    {scenes.map(kind => <div key={kind} className={'v15-scene v15-' + kind} data-active={kind === scene}>
      <div className="v15-glow" /><div className="v15-clouds" />
      <div className="v15-particles">{Array.from({length: kind === 'storm' ? 28 : 16}, (_,i) =>
        <i key={i} style={{left: ((i * 37 + 9) % 100) + '%', top: ((i * 23) % 100) + '%',
          animationDelay: -(i * .73) + 's', animationDuration: (kind === 'snow' ? 9 + i % 6 : 2.4 + (i % 5) * .3) + 's'}} />)}</div>
    </div>)}
  </div>;
}
