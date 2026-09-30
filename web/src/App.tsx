import { Showcase } from './design/Showcase';

export default function App(): React.JSX.Element {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <h1 className="text-2xl font-semibold">42 PeerConnect: Design system</h1>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Showcase />
      </main>
    </div>
  );
}
