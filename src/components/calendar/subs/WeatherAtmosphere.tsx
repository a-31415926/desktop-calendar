const scenes = ['neutral', 'sun', 'cloud-sun', 'cloud', 'rain', 'storm', 'snow', 'fog'];
/** Only decorations dissolve. The opaque sky base interpolates its color independently. */
export default function WeatherAtmosphere({scene,night=false}: {scene:string;night?:boolean}) {
 return <div className="calendar-weather-atmosphere v16-atmosphere" data-night={night} aria-hidden="true">
  {scenes.map(kind=><div key={kind} className={'v16-scene v16-'+kind} data-active={kind===scene}>
   {(kind==='sun'||kind==='cloud-sun')&&<div className={night?'v16-moon':'v16-sun-disc'}/>}
   {kind!=='sun'&&kind!=='neutral'&&<><div className="v16-cloud v16-cloud-a"/><div className="v16-cloud v16-cloud-b"/></>}
   {kind==='fog'&&<div className="v16-fog-ribbon"/>}
   <div className="v16-particles">{Array.from({length:kind==='storm'?24:14},(_,i)=><i key={i} style={{left:((i*37+9)%100)+'%',top:((i*23)%100)+'%',animationDelay:-(i*.73)+'s',animationDuration:(kind==='snow'?10+i%6:2.6+(i%5)*.3)+'s'}}/>)}</div>
  </div>)}
 </div>;
}
