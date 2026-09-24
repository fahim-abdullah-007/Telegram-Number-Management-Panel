import type { Response } from 'express';

export const ok = (res: Response, data: unknown, message = 'Operation successful', status = 200) => res.status(status).json({ success: true, data, message });
export const fail = (res: Response, message: string, error: string, status = 400) => res.status(status).json({ success: false, message, error });
