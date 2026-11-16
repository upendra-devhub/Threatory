import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errors.js";
import { scanRepository } from "../repositories/scanRepository.js";

export const dashboardRouter = Router();

// GET /api/dashboard/summary
dashboardRouter.get(
  "/summary",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ownerId = req.userId || req.ownerId;
      if (!ownerId) {
        throw new AppError("UNAUTHORIZED", "Authentication required");
      }

      const summary = await scanRepository.getDashboardSummary(ownerId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
);
