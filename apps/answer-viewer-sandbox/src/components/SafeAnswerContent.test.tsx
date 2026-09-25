import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SafeAnswerContent } from './SafeAnswerContent';

afterEach(() => cleanup());

describe('SafeAnswerContent', () => {
  it('renders useful markdown', () => {
    render(<SafeAnswerContent content={'## Heading\n\n- item\n\n|A|B|\n|-|-|\n|1|2|'} />);
    expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByText('item')).toBeInTheDocument();
  });

  it('wraps GFM tables in an overflow-safe container', () => {
    const { container } = render(
      <SafeAnswerContent content={'|A|B|\n|-|-|\n|1|2|'} />,
    );
    const wrapper = container.querySelector('.table-scroll');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector('table')).not.toBeNull();
  });

  it('does not create executable markup', () => {
    const { container } = render(
      <SafeAnswerContent content={'<script>alert(1)</script> <img src=x onerror=alert(1)> [bad](javascript:alert(1))'} />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
  });
});
