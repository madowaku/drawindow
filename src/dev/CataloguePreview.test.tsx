// @vitest-environment jsdom
import { afterEach,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { CataloguePreview } from './CataloguePreview';
vi.mock('../components/WindowCanvas',()=>({WindowCanvas:()=> <div>Anonymous picture</div>}));
vi.stubGlobal('matchMedia',()=>({matches:true}));
afterEach(()=>{cleanup();window.history.replaceState({},'','/');});
it('withholds target names and written choices until all raw observations are recorded',()=>{
  render(<CataloguePreview />);
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(document.body.textContent).not.toMatch(/\bowl\b|\bqueen\b|qd-/i);
  for(let i=0;i<7;i++){
    fireEvent.change(screen.getByLabelText('何の絵？'),{target:{value:'unsure'}});
    fireEvent.change(screen.getByLabelText('そう思った理由'),{target:{value:'Two round shapes'}});
    fireEvent.submit(screen.getByRole('button',{name:'記録して次へ'}).closest('form')!);
    if(i<6)expect(document.body.textContent).not.toMatch(/\bowl\b|\bqueen\b|qd-/i);
  }
  expect(screen.getByText(/記録完了/)).toBeTruthy();
  expect(document.querySelectorAll('li')).toHaveLength(7);
  expect(document.body.textContent).toContain('owl');
});
it('provides explicitly labelled maker review without mixing it with blind observation records',()=>{
  window.history.replaceState({},'','/?catalogue-preview&review');
  render(<CataloguePreview />);
  expect(screen.getByRole('combobox',{name:'制作サンプル'})).toBeTruthy();
  expect(screen.queryByRole('button',{name:'観察JSONを保存'})).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
});
