BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[portfolios] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [broker_id] NVARCHAR(1000),
    [name] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [has_own_cash] BIT NOT NULL CONSTRAINT [portfolios_has_own_cash_df] DEFAULT 1,
    [opened_at] DATETIME2 NOT NULL,
    [cash_balance] FLOAT(53) NOT NULL CONSTRAINT [portfolios_cash_balance_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [portfolios_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [portfolios_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[assets] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [isin] NVARCHAR(1000),
    [ticker] NVARCHAR(1000),
    [currency] NVARCHAR(1000) NOT NULL CONSTRAINT [assets_currency_df] DEFAULT 'EUR',
    [last_price] FLOAT(53),
    [last_price_at] DATETIME2,
    [auto_update] BIT NOT NULL CONSTRAINT [assets_auto_update_df] DEFAULT 1,
    CONSTRAINT [assets_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[positions] (
    [id] NVARCHAR(1000) NOT NULL,
    [portfolio_id] NVARCHAR(1000) NOT NULL,
    [asset_id] NVARCHAR(1000) NOT NULL,
    [quantity] FLOAT(53) NOT NULL CONSTRAINT [positions_quantity_df] DEFAULT 0,
    [pru] FLOAT(53) NOT NULL CONSTRAINT [positions_pru_df] DEFAULT 0,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [positions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [positions_portfolio_id_asset_id_key] UNIQUE NONCLUSTERED ([portfolio_id],[asset_id])
);

-- CreateTable
CREATE TABLE [dbo].[portfolio_transactions] (
    [id] NVARCHAR(1000) NOT NULL,
    [portfolio_id] NVARCHAR(1000) NOT NULL,
    [asset_id] NVARCHAR(1000),
    [type] NVARCHAR(1000) NOT NULL,
    [quantity] FLOAT(53),
    [price] FLOAT(53),
    [amount] FLOAT(53) NOT NULL,
    [fees] FLOAT(53) NOT NULL CONSTRAINT [portfolio_transactions_fees_df] DEFAULT 0,
    [date] DATETIME2 NOT NULL,
    [external_id] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [portfolio_transactions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [portfolio_transactions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[brokers] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [cash_balance] FLOAT(53) NOT NULL CONSTRAINT [brokers_cash_balance_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [brokers_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [brokers_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[broker_cash_transactions] (
    [id] NVARCHAR(1000) NOT NULL,
    [broker_id] NVARCHAR(1000) NOT NULL,
    [portfolio_id] NVARCHAR(1000),
    [portfolio_transaction_id] NVARCHAR(1000),
    [type] NVARCHAR(1000) NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [balance_after] FLOAT(53) NOT NULL CONSTRAINT [broker_cash_transactions_balance_after_df] DEFAULT 0,
    [date] DATETIME2 NOT NULL,
    [external_id] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [broker_cash_transactions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [broker_cash_transactions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex (filtered: SQL Server unique constraints/indexes only allow one
-- NULL, but most rows have no external_id, so uniqueness is enforced only
-- among non-null values. Wrapped in dynamic SQL because SQL Server binds an
-- entire batch before executing it, so a column created earlier in this same
-- batch is not yet visible to a plain CREATE INDEX statement.)
EXEC(N'CREATE UNIQUE NONCLUSTERED INDEX [portfolio_transactions_external_id_key]
    ON [dbo].[portfolio_transactions]([external_id])
    WHERE [external_id] IS NOT NULL');

EXEC(N'CREATE UNIQUE NONCLUSTERED INDEX [broker_cash_transactions_external_id_key]
    ON [dbo].[broker_cash_transactions]([external_id])
    WHERE [external_id] IS NOT NULL');

-- CreateIndex (filtered: a broker_cash_transaction is linked to at most one
-- portfolio_transaction, but most rows -- deposits/withdrawals -- have none,
-- same pattern as external_id above)
EXEC(N'CREATE UNIQUE NONCLUSTERED INDEX [broker_cash_transactions_portfolio_transaction_id_key]
    ON [dbo].[broker_cash_transactions]([portfolio_transaction_id])
    WHERE [portfolio_transaction_id] IS NOT NULL');

-- AddForeignKey
ALTER TABLE [dbo].[portfolios] ADD CONSTRAINT [portfolios_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[assets] ADD CONSTRAINT [assets_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[positions] ADD CONSTRAINT [positions_portfolio_id_fkey] FOREIGN KEY ([portfolio_id]) REFERENCES [dbo].[portfolios]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[positions] ADD CONSTRAINT [positions_asset_id_fkey] FOREIGN KEY ([asset_id]) REFERENCES [dbo].[assets]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[portfolio_transactions] ADD CONSTRAINT [portfolio_transactions_portfolio_id_fkey] FOREIGN KEY ([portfolio_id]) REFERENCES [dbo].[portfolios]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[portfolio_transactions] ADD CONSTRAINT [portfolio_transactions_asset_id_fkey] FOREIGN KEY ([asset_id]) REFERENCES [dbo].[assets]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[brokers] ADD CONSTRAINT [brokers_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[broker_cash_transactions] ADD CONSTRAINT [broker_cash_transactions_broker_id_fkey] FOREIGN KEY ([broker_id]) REFERENCES [dbo].[brokers]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[broker_cash_transactions] ADD CONSTRAINT [broker_cash_transactions_portfolio_id_fkey] FOREIGN KEY ([portfolio_id]) REFERENCES [dbo].[portfolios]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[broker_cash_transactions] ADD CONSTRAINT [broker_cash_transactions_portfolio_transaction_id_fkey] FOREIGN KEY ([portfolio_transaction_id]) REFERENCES [dbo].[portfolio_transactions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[portfolios] ADD CONSTRAINT [portfolios_broker_id_fkey] FOREIGN KEY ([broker_id]) REFERENCES [dbo].[brokers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
