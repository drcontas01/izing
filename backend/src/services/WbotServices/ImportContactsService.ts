import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import Contact from "../../models/Contact";
import { logger } from "../../utils/logger";

const ImportContactsService = async (tenantId) => {
  try {
    const defaultWhatsapp = await GetDefaultWhatsApp(tenantId);

    if (!defaultWhatsapp) {
      logger.error("Default WhatsApp not found.");
      return;
    }

    const wbot = getWbot(defaultWhatsapp.id);

    let phoneContacts;

    try {
      phoneContacts = await wbot.getContacts();
    } catch (err) {
      logger.error(
        `Could not get WhatsApp contacts from phone. Check connection page. | Error: ${err}`
      );
      return;
    }

    if (phoneContacts) {
      await Promise.all(
        phoneContacts.map(async ({ number, name }) => {
          if (!number) {
            return null;
          }
          if (!name) {
            name = number;
          }

          const numberExists = await Contact.findOne({
            where: { number, tenantId },
          });

          if (numberExists) {
            logger.info(`Contact ${number} already exists.`);
            return null;
          }

          try {
            await Contact.create({ number, name, tenantId });
            logger.info(`Contact ${number} inserted successfully.`);
          } catch (error) {
            logger.error(`Error while inserting contact ${number}: ${error.message}`);
          }
        })
      );
    }
  } catch (error) {
    logger.error(`Error in ImportContactsService: ${error.message}`);
  }
};

export default ImportContactsService;
