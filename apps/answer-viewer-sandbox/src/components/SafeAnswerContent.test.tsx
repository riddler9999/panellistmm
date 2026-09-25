import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SafeAnswerContent } from './SafeAnswerContent';
describe('SafeAnswerContent',()=>{it('renders useful markdown',()=>{render(<SafeAnswerContent content={'## Heading\n\n- item\n\n|A|B|\n|-|-|\n|1|2|'} />);expect(screen.getByRole('heading',{name:'Heading'})).toBeInTheDocument();expect(screen.getByText('item')).toBeInTheDocument();});it('does not create executable markup',()=>{const {container}=render(<SafeAnswerContent content={'<script>alert(1)</script> <img src=x onerror=alert(1)> [bad](javascript:alert(1))'} />);expect(container.querySelector('script')).toBeNull();expect(container.querySelector('img')).toBeNull();expect(screen.getByText('bad').closest('a')).toBeNull();});});
