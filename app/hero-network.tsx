'use client';
import { useEffect, useRef, useState } from 'react';

export default function HeroNetwork({ en, enabled }: { en: boolean; enabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (ref.current) observer.observe(ref.current);
    const visibility = () => { if (document.hidden) setVisible(false); else if (ref.current) setVisible(ref.current.getBoundingClientRect().bottom > 0); };
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  const nodes = [[70,100,'NETWORK'],[200,45,'CLOUD'],[330,100,'WEB'],[70,260,'HARDWARE'],[330,260,'AUTOMATION'],[200,330,'SUPPORT']] as const;
  return <div ref={ref} className={`infrastructure hero-network ${enabled && !paused && visible ? 'flowing' : ''}`}>
    <div className="diagram-top"><span>AY / SYSTEM MAP</span><span>{en ? 'ILLUSTRATED NETWORK' : 'ILUSTRASI JARINGAN'}</span></div>
    <svg viewBox="0 0 400 380" role="img" aria-label={en ? 'Data paths connecting people, networks, cloud and technical support' : 'Jalur data menghubungkan manusia, jaringan, cloud dan dukungan teknis'}>
      <g fill="none" stroke="currentColor">{nodes.map(([x,y,label],i)=><g key={label}><path opacity=".25" d={`M200 185 L${x} ${y}`}/><path className="data-packet" pathLength="100" style={{animationDelay:`${i * -.6}s`}} d={`M200 185 L${x} ${y}`}/></g>)}</g>
      <g className="node"><circle cx="200" cy="185" r="47"/><text x="200" y="180" textAnchor="middle" className="node-symbol">ay.</text><text x="200" y="204" textAnchor="middle">HUMAN FIRST</text></g>
      {nodes.map(([x,y,label])=><g className="satellite" key={label}><rect x={x-18} y={y-14} width="36" height="28" rx="5" fill="var(--bg)" stroke="currentColor"/><circle cx={x-8} cy={y} r="2"/><path d={`M${x-2} ${y-4}h12m-12 8h12`} stroke="currentColor"/><text x={x} y={y+30} textAnchor="middle">{label}</text></g>)}
    </svg>
    <div className="diagram-bottom"><span>TECHNOLOGY → PEOPLE</span>{enabled && <button className="motion-control" onClick={()=>setPaused(!paused)} aria-pressed={paused}>{paused ? (en ? 'Play animation' : 'Putar animasi') : (en ? 'Pause animation' : 'Jeda animasi')}</button>}</div>
  </div>;
}
