import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

export class AnswerRenderBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Sandbox viewer intentionally renders a generic state without exposing error details.
  }

  render() {
    if (this.state.failed) return <AnswerUnavailableState />;
    return this.props.children;
  }
}

export function AnswerUnavailableState() {
  return (
    <section className="state-card">
      <strong>Answer Unavailable</strong>
      <p>အတည်ပြုပြီးသော အဖြေကို ယခုအချိန်တွင် မပြနိုင်သေးပါ။ HR team ကို ဆက်သွယ်ပါ။</p>
    </section>
  );
}
