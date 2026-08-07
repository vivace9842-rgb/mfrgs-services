import { Request, Response } from "express";
import { OSINTSimulatorService } from "../services/osintSimulatorService.js";


const osintService =
  new OSINTSimulatorService();



export class OSINTController {


  // =============================
  // OSINT SIMULATION
  // =============================

  public static simulate(
    req: Request,
    res: Response
  ): void {

    try {

      const {
        query
      } = req.body ?? {};



      if (
        !query ||
        typeof query !== "string"
      ) {

        res.status(400).json({

          success:false,

          error:
            "Target query string is required."

        });

        return;

      }



      const result =
        osintService.simulateScan(
          query.trim()
        );



      res.status(200).json({

        success:true,

        data:result

      });



    } catch(error: unknown) {


      console.error(
        "[OSINT_SIMULATE_ERROR]",
        error
      );


      res.status(500).json({

        success:false,

        error:
          "Internal OSINT simulation error."

      });


    }

  }




  // =============================
  // RISK MATRIX
  // =============================

  public static calculateRisk(
    req: Request,
    res: Response
  ): void {


    try {


      const {
        partnerJurisdiction,
        transactionValue,
        paymentTerms,
        relationshipLength,
        hasPhysicalOffice,

      } = req.body ?? {};



      if (
        !partnerJurisdiction ||
        !paymentTerms
      ) {

        res.status(400).json({

          success:false,

          error:
            "Invalid quiz inputs."

        });


        return;

      }



      const assessment =
        osintService.calculateRiskExposure({

          partnerJurisdiction,

          transactionValue:
            Number(transactionValue) || 0,


          paymentTerms,


          relationshipLength:
            relationshipLength || "NEW",


          hasPhysicalOffice:
            hasPhysicalOffice === true ||
            hasPhysicalOffice === "true",

        });



      res.status(200).json({

        success:true,

        assessment

      });



    } catch(error: unknown) {


      console.error(
        "[OSINT_RISK_ERROR]",
        error
      );


      res.status(500).json({

        success:false,

        error:
          "Internal risk calculation error."

      });


    }


  }


}