BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[expenses] ADD [dateEndRecurring] DATETIME2;

-- AlterTable
ALTER TABLE [dbo].[incomes] ADD [dateEndRecurring] DATETIME2;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
