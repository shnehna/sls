import { Link } from 'react-router-dom'

export default function LockedTranscriptPanel() {
  return (
    <section className="studio-transcript-surface grid min-h-[70vh] place-items-center p-8 text-center lg:h-[calc(100vh-8rem)]">
      <div className="mx-auto max-w-xl">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full border border-paper-700/15 bg-white/50 text-3xl text-paper-900">🔒</div>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[.18em] text-paper-700/45">Member learning space</p>
        <h2 className="mt-3 font-display text-4xl font-bold tracking-[-.05em] text-paper-900">Transcripts are available after login</h2>
        <p className="mt-4 text-sm leading-7 text-paper-700/75">
          Sign in to unlock synced transcript reading, cue-by-cue shadowing, AI transcription, bookmarks, and progress sync across devices.
        </p>
        <div className="mt-6 grid gap-2 text-left text-sm text-paper-700/80 sm:grid-cols-2">
          {['Synced transcript reading', 'Cue-by-cue shadowing', 'AI transcription', 'Bookmarks and progress sync'].map((item) => (
            <div key={item} className="rounded-2xl border border-paper-700/10 bg-white/35 px-4 py-3">✓ {item}</div>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/auth/login" className="rounded-full bg-paper-900 px-5 py-2.5 text-sm font-semibold text-paper-50 transition hover:bg-paper-800">Log in</Link>
          <Link to="/auth/register" className="rounded-full border border-paper-700/15 px-5 py-2.5 text-sm font-semibold text-paper-800 transition hover:bg-white/40">Create account</Link>
        </div>
      </div>
    </section>
  )
}
