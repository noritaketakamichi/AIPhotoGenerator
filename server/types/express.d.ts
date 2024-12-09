// server/types/express.d.ts
import { User as MyUser } from "../path/to/your/UserInterface"; // 必要に応じて修正
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      credit: number;
      created_at: Date;
    }
  }
}
