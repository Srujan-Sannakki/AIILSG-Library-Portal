import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SecureReader from './SecureReader';
import * as API from '../api';
const { destroy, cancel, getDocument } = vi.hoisted(()=>({destroy:vi.fn(async()=>{}),cancel:vi.fn(),getDocument:vi.fn()}));
vi.mock('../api',()=>({fetchPage:vi.fn()}));
vi.mock('pdfjs-dist',()=>({GlobalWorkerOptions:{},getDocument}));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url',()=>({default:'/worker.mjs'}));
beforeEach(()=>{
  vi.clearAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({});
  API.fetchPage.mockResolvedValue({data:new ArrayBuffer(8)});
  // PDF.js 6 exposes destroy on the loading task, not on PDFDocumentProxy.
  getDocument.mockImplementation(()=>({destroy,promise:Promise.resolve({getPage:async()=>({getViewport:()=>({width:100,height:100}),render:()=>({cancel,promise:Promise.resolve()})})})}));
});
afterEach(cleanup);
it('navigates and unmounts without calling a nonexistent document destroy method',async()=>{
  const result=render(<SecureReader book={{customId:'book',title:'Book',totalPages:2}} onClose={()=>{}}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Next page'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Next page'}));
  await waitFor(()=>expect(API.fetchPage).toHaveBeenCalledWith('book',2,expect.any(AbortSignal)));
  await waitFor(()=>expect(screen.queryByRole('status')).not.toBeInTheDocument());
  result.unmount();expect(destroy).toHaveBeenCalledTimes(2);
});
it('shows an unauthorized-page error while keeping the reader usable',async()=>{
  render(<SecureReader book={{customId:'book',title:'Book',totalPages:2}} onClose={()=>{}}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Next page'})).toBeEnabled());
  API.fetchPage.mockRejectedValueOnce({response:{status:403,data:new TextEncoder().encode(JSON.stringify({error:'Page not entitled'})).buffer}});
  fireEvent.click(screen.getByRole('button',{name:'Next page'}));
  await screen.findByText('Page not entitled');
  expect(screen.getByRole('button',{name:'Previous page'})).toBeEnabled();
});
