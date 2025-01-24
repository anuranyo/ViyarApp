export interface Schedule {
    _id: string;
    employee: string;
    date: string;
    action: string;
    department: string | null;
    duty: boolean;
  }
  