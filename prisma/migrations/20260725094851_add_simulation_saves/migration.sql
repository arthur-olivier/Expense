BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[simulation_saves] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [depart] FLOAT(53) NOT NULL CONSTRAINT [simulation_saves_depart_df] DEFAULT 0,
    [mensuel] FLOAT(53) NOT NULL CONSTRAINT [simulation_saves_mensuel_df] DEFAULT 0,
    [objectif] FLOAT(53) NOT NULL CONSTRAINT [simulation_saves_objectif_df] DEFAULT 0,
    [duree] INT NOT NULL CONSTRAINT [simulation_saves_duree_df] DEFAULT 10,
    [taux] FLOAT(53) NOT NULL CONSTRAINT [simulation_saves_taux_df] DEFAULT 5,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [simulation_saves_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [simulation_saves_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[simulation_saves] ADD CONSTRAINT [simulation_saves_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
