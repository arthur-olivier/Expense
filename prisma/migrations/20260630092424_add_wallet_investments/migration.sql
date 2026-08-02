BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[financial_accounts] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [is_locked] BIT NOT NULL CONSTRAINT [financial_accounts_is_locked_df] DEFAULT 0,
    [balance] FLOAT(53) NOT NULL CONSTRAINT [financial_accounts_balance_df] DEFAULT 0,
    [balance_updated_at] DATETIME2 NOT NULL CONSTRAINT [financial_accounts_balance_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [financial_accounts_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [financial_accounts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[wallet_categories] (
    [id] NVARCHAR(1000) NOT NULL,
    [account_id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [balance] FLOAT(53) NOT NULL CONSTRAINT [wallet_categories_balance_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [wallet_categories_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [wallet_categories_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[wallet_transactions] (
    [id] INT NOT NULL IDENTITY(1,1),
    [category_id] NVARCHAR(1000) NOT NULL,
    [investment_id] INT,
    [label] NVARCHAR(1000) NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [date] DATETIME2 NOT NULL CONSTRAINT [wallet_transactions_date_df] DEFAULT CURRENT_TIMESTAMP,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [wallet_transactions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [wallet_transactions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[investments] (
    [id] INT NOT NULL IDENTITY(1,1),
    [user_id] NVARCHAR(1000) NOT NULL,
    [account_id] NVARCHAR(1000) NOT NULL,
    [category_id] NVARCHAR(1000),
    [label] NVARCHAR(1000) NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [date] DATETIME2 NOT NULL,
    [is_recurring] BIT NOT NULL,
    [date_end_recurring] DATETIME2,
    [last_generated_at] DATETIME2,
    CONSTRAINT [investments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[financial_accounts] ADD CONSTRAINT [financial_accounts_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[wallet_categories] ADD CONSTRAINT [wallet_categories_account_id_fkey] FOREIGN KEY ([account_id]) REFERENCES [dbo].[financial_accounts]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[wallet_transactions] ADD CONSTRAINT [wallet_transactions_category_id_fkey] FOREIGN KEY ([category_id]) REFERENCES [dbo].[wallet_categories]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[wallet_transactions] ADD CONSTRAINT [wallet_transactions_investment_id_fkey] FOREIGN KEY ([investment_id]) REFERENCES [dbo].[investments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[investments] ADD CONSTRAINT [investments_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[investments] ADD CONSTRAINT [investments_account_id_fkey] FOREIGN KEY ([account_id]) REFERENCES [dbo].[financial_accounts]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[investments] ADD CONSTRAINT [investments_category_id_fkey] FOREIGN KEY ([category_id]) REFERENCES [dbo].[wallet_categories]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
