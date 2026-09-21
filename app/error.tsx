'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="empty-page"><h1>Terjadi kendala.<br/>Something went wrong.</h1><p>Silakan coba lagi atau hubungi melalui WhatsApp.</p><button onClick={reset}>Coba lagi / Retry</button><p><a href="https://wa.me/6285291916565">WhatsApp ↗</a></p></main>;}
