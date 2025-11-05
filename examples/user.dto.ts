import { LoanDto } from './loan.dto';

export class UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  loans?: LoanDto[];
}
