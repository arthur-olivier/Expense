BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[wallet_transactions] ADD [balance_after] FLOAT(53) NOT NULL CONSTRAINT [wallet_transactions_balance_after_df] DEFAULT 0;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
