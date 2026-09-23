import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as API from './api';
import App from './App';
vi.mock('./api',()=>({createEnquiry:vi.fn(),getToken:vi.fn(),setToken:vi.fn(),me:vi.fn(),login:vi.fn(),logout:vi.fn(),fetchBooks:vi.fn(),fetchSettings:vi.fn(),fetchUsers:vi.fn(),fetchAdmins:vi.fn(),fetchInventory:vi.fn(),fetchTransactions:vi.fn(),fetchVisitors:vi.fn(),fetchReports:vi.fn(),fetchLogs:vi.fn(),errorMessage:e=>e.message}));
beforeEach(()=>{vi.clearAllMocks();API.getToken.mockReturnValue(null);API.fetchSettings.mockResolvedValue({data:{announcement:'Test notice',maintenanceMode:false}});API.fetchBooks.mockResolvedValue({data:{items:[],total:0}});});
afterEach(cleanup);
it('does not fetch protected data before login',()=>{
  render(<App/>);expect(screen.getByText('Authorized Access Only')).toBeInTheDocument();
  expect(API.fetchUsers).not.toHaveBeenCalled();expect(API.fetchBooks).not.toHaveBeenCalled();expect(API.fetchAdmins).not.toHaveBeenCalled();
  expect(screen.queryByText('Demo Credentials')).not.toBeInTheDocument();
});
it('loads only authorized student data after login succeeds',async()=>{
  API.login.mockResolvedValue({data:{token:'student-token',user:{_id:'student',sid:'111111111111111',name:'Test Student',role:'student',access:[],paidAmount:50,totalFee:100,validFrom:'2020-01-01',validUntil:'2099-12-31'}}});
  API.me.mockResolvedValue({data:(await API.login()).data.user});
  render(<App/>);
  fireEvent.change(screen.getByPlaceholderText('e.g. 122010620230039'),{target:{value:'111111111111111'}});
  fireEvent.change(screen.getByPlaceholderText('••••••'),{target:{value:'Test-password-12345'}});
  fireEvent.click(screen.getByRole('button',{name:'Authenticate & Login'}));
  await screen.findByText('Welcome, Test Student');
  await waitFor(()=>expect(API.fetchBooks).toHaveBeenCalled());
  expect(API.fetchUsers).not.toHaveBeenCalled();expect(API.fetchAdmins).not.toHaveBeenCalled();expect(API.fetchLogs).not.toHaveBeenCalled();
});
it('shows a data-load error and a retry action instead of pretending the list is empty',async()=>{
  API.getToken.mockReturnValue('existing');API.me.mockResolvedValue({data:{_id:'student',sid:'111111111111111',name:'Test Student',role:'student',access:[],paidAmount:0,totalFee:100}});
  API.fetchBooks.mockRejectedValue(new Error('Connection failed'));
  render(<App/>);await screen.findByRole('alert');expect(screen.getByText('Connection failed')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Retry'})).toBeInTheDocument();
});
