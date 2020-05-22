module.exports = itf => Msa.require('db').withDb(async db => {
    await db.run(
        `CREATE TABLE IF NOT EXISTS msa_pages (
		id VARCHAR(255) PRIMARY KEY,
		content TEXT,
		createdById VARCHAR(255),
		createdBy VARCHAR(255),
		createdAt DATETIME,
		updatedBy VARCHAR(255),
		updatedAt DATETIME,
		params TEXT
	)`)
})
