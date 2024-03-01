import { QueryTypes } from "sequelize";
import { getWbot } from "../../libs/wbot";
import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";

const SyncContactsWhatsappInstanceService = async (
  whatsappId: number,
  tenantId: number
): Promise<void> => {
  const wbot = getWbot(whatsappId);

  let contacts;

  try {
    contacts = await wbot.getContacts();
  } catch (err) {
    logger.error(
      `Could not get WhatsApp contacts from phone. Check connection page. | Error: ${err}`
    );
  }

  if (!contacts) {
    throw new AppError("ERR_CONTACTS_NOT_EXISTS_WHATSAPP", 404);
  }

  try {
    const dataArray: object[] = [];
    await Promise.all(
      contacts.map(async ({ name, pushname, number, isGroup }) => {
        if ((name || pushname) && !isGroup) {
          const contactObj = { name: name || pushname, number, tenantId };
          dataArray.push(contactObj);
        }
      })
    );

    if (dataArray.length) {
      const d = new Date().toJSON();
      const query = `INSERT INTO "Contacts" (number, name, "tenantId", "createdAt", "updatedAt") VALUES
        ${dataArray
          .map((e: any) => {
            // Escape values to prevent SQL errors
            const escapedNumber = Contact.sequelize.escape(e.number);
            const escapedName = Contact.sequelize.escape(e.name);
            const escapedTenantId = Contact.sequelize.escape(e.tenantId);

            return `(${escapedNumber},
              ${escapedName},
              ${escapedTenantId},
              '${d}'::timestamp,
              '${d}'::timestamp)`;
          })
          .join(",")}
        ON CONFLICT (number, "tenantId") DO NOTHING`;

      logger.info(`Generated SQL query: ${query}`);

      await Contact.sequelize?.query(query, {
        type: QueryTypes.INSERT,
        logging: console.log
      });
    }
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

export default SyncContactsWhatsappInstanceService;
