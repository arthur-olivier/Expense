BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[broker_cash_transactions] ADD [counterparty_label] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[portfolio_transactions] ADD [counterparty_label] NVARCHAR(1000);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
