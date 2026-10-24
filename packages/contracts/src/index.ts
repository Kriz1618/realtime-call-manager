export interface IncomingCallWebhookPayload {
  callId: string;
  phoneNumber: string;
  agent: string;
  durationSeconds: number;
  recordingUrl: string;
}

export interface CallDto {
  id: string;
  callId: string;
  phoneNumber: string;
  agent: string;
  durationSeconds: number;
  recordingUrl: string;
  isSpam: boolean;
  isRepeatCaller: boolean;
  previousCallsCount: number;
  receivedAt: string;
}

export interface RegisterCallResponse {
  duplicated: boolean;
  call: CallDto;
}

export const CALL_EVENTS = {
  CREATED: 'call.created',
  SPAM_UPDATED: 'call.spam_updated',
} as const;

export type CallEventType = (typeof CALL_EVENTS)[keyof typeof CALL_EVENTS];

export interface CallEvent {
  type: CallEventType;
  data: CallDto;
}

export const CALL_SORT_FIELDS = ['receivedAt', 'durationSeconds'] as const;
export type CallSortField = (typeof CALL_SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export interface ListCallsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  agent?: string;
  isSpam?: boolean;
  isRepeatCaller?: boolean;
  from?: string;
  to?: string;
  sortBy?: CallSortField;
  order?: SortOrder;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type ListCallsResponse = Paginated<CallDto>;
