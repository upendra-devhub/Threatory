import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errors.js";
import { scanRepository } from "../repositories/scanRepository.js";

export const scansRouter = Router();

// GET /api/scans/:scanId
scansRouter.get(
  "/:scanId",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { scanId } = req.params;
      const ownerId = req.ownerId;

      if (!ownerId) {
        throw new AppError("INTERNAL", "Missing owner identification");
      }

      if (!scanId) {
        throw new AppError("VALIDATION_ERROR", "scanId parameter is required");
      }

      const scan = await scanRepository.getById(scanId, ownerId);
      if (!scan) {
        throw new AppError("NOT_FOUND", `Scan ${scanId} not found`);
      }

      res.status(200).json({
        success: true,
        data: scan,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/scans/:scanId
scansRouter.delete(
  "/:scanId",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { scanId } = req.params;
      const ownerId = req.ownerId;

      if (!ownerId) {
        throw new AppError("INTERNAL", "Missing owner identification");
      }

      if (!scanId) {
        throw new AppError("VALIDATION_ERROR", "scanId parameter is required");
      }

      const deleted = await scanRepository.delete(scanId, ownerId);
      if (!deleted) {
        throw new AppError("NOT_FOUND", `Scan ${scanId} not found`);
      }

      res.status(200).json({
        success: true,
        data: {
          deleted: true,
          scanId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);
