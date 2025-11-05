import { FxPayloadDto } from './fx-payload.dto';

export class LoanDto {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  fxPayload?: FxPayloadDto;
  createdAt: Date;
  updatedAt: Date;
}
