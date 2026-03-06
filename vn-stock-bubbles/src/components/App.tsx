import { Header } from './Header';
import { BubbleCanvas } from './BubbleCanvas';

export function App() {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <BubbleCanvas />
    </div>
  );
}
