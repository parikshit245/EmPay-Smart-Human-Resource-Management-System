CREATE TYPE "LeaveType" AS ENUM ('PAID', 'SICK', 'UNPAID', 'OTHER');

ALTER TABLE "TimeOffRequest"
ALTER COLUMN "leaveType" TYPE "LeaveType"
USING (
  CASE
    WHEN upper(replace("leaveType", ' ', '_')) IN ('PAID', 'PAID_LEAVE', 'CASUAL_LEAVE') THEN 'PAID'
    WHEN upper(replace("leaveType", ' ', '_')) IN ('SICK', 'SICK_LEAVE') THEN 'SICK'
    WHEN upper(replace("leaveType", ' ', '_')) IN ('UNPAID', 'UNPAID_LEAVE') THEN 'UNPAID'
    ELSE 'OTHER'
  END
)::"LeaveType";
