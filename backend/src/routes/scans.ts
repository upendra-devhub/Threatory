import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Module, UrlScanRequest, WebsiteScanRequest } from "@threatory/contracts";
import { AppError, validateWithZod } from "../middleware/errors.js";
import { scanRepository } from "../repositories/scanRepository.js";
import { analyseUrlAsync } from "../modules/url/service.js";
import { analysePrivacy } from "../modules/privacy/service.js";
import { analyseWebsite } from "../modules/website/service.js";

export const HistoryQuerySchema = z.object({
  module: Module.optional(),
  status: z.enum(["completed", "partial", "failed"]).optional(),
  from: z
    .string()
    .datetime({ offset: true })
    .or(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid date format",
        })
    )
    .optional(),
  to: z
    .string()
    .datetime({ offset: true })
    .or(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid date format",
        })
    )
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type HistoryQuery = z.infer<typeof HistoryQuerySchema>;

export const scansRouter = Router();

// POST /api/scans/url
scansRouter.post(
  "/url",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ownerId = req.ownerId;
      if (!ownerId) {
        throw new AppError("INTERNAL", "Missing owner identification");
      }

      const body = validateWithZod(UrlScanRequest, req.body);
      const { report } = await analyseUrlAsync(body.url);

      const savedReport = await scanRepository.create({
        scanId: report.scanId,
        ownerId,
        module: "url",
        status: report.status,
        rulesVersion: report.rulesVersion,
        targetSummary: report.targetSummary,
        assessment: report.assessment,
        findings: report.findings,
        limitations: report.limitations,
        details: report.details,
        createdAt: report.createdAt,
      });

      res.status(201).json({
        success: true,
        data: savedReport,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/scans/privacy
scansRouter.post(
  "/privacy",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ownerId = req.ownerId;
      if (!ownerId) {
        throw new AppError("INTERNAL", "Missing owner identification");
      }

      const { report } = analysePrivacy(req.body);

      const savedReport = await scanRepository.create({
        scanId: report.scanId,
        ownerId,
        module: "privacy",
        status: report.status,
        rulesVersion: report.rulesVersion,
        targetSummary: report.targetSummary,
        assessment: report.assessment,
        findings: report.findings,
        limitations: report.limitations,
        details: report.details,
        createdAt: report.createdAt,
      });

      res.status(200).json({
        success: true,
        data: savedReport,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/scans/website
scansRouter.post(
  "/website",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ownerId = req.ownerId;
      if (!ownerId) {
        throw new AppError("INTERNAL", "Missing owner identification");
      }

      const body = validateWithZod(WebsiteScanRequest, req.body);
      const { report } = await analyseWebsite(body.url);

      const savedReport = await scanRepository.create({
        scanId: report.scanId,
        ownerId,
        module: "website",
        status: report.status,
        rulesVersion: report.rulesVersion,
        targetSummary: report.targetSummary,
        assessment: report.assessment,
        findings: report.findings,
        limitations: report.limitations,
        details: report.details,
        createdAt: report.createdAt,
      });

      res.status(200).json({
        success: true,
        data: savedReport,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/scans
scansRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ownerId = req.ownerId;
      if (!ownerId) {
        throw new AppError("INTERNAL", "Missing owner identification");
      }

      const cleanQuery: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(req.query)) {
        if (typeof val === "string" && val.trim() === "") {
          continue;
        }
        cleanQuery[key] = val;
      }

      const query = validateWithZod(HistoryQuerySchema, cleanQuery);

      const historyPage = await scanRepository.list({
        ownerId,
        module: query.module,
        status: query.status,
        from: query.from,
        to: query.to,
        page: query.page,
        limit: query.limit,
      });

      res.status(200).json({
        success: true,
        data: historyPage,
      });
    } catch (error) {
      next(error);
    }
  }
);

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
