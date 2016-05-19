<?php
namespace CAG\RtePlus\Command;

/**
 * Class RtePlusCommandController
 *
 * @package CAG\RtePlus\Command
 * @author Kai Groetenhardt <k.groetenhardt@connecta.ag>
 * @author Jochen Rieger <j.rieger@connecta.ag>
 */
class RtePlusCommandController extends \TYPO3\CMS\Extbase\Mvc\Controller\CommandController {

    /**
     * @var \TYPO3\CMS\Extbase\Configuration\ConfigurationManagerInterface
     * @inject
     */
    protected $configurationManager;

    /**
     * The settings.
     *
     * @var array
     */
    protected $settings = array();

    /**
     * Initialize the controller.
     */
    protected function initialize() {

        $this->settings = $this->configurationManager->getConfiguration(
            \TYPO3\CMS\Extbase\Configuration\ConfigurationManagerInterface::CONFIGURATION_TYPE_SETTINGS,
            'RtePlus', 'RtePlus'
        );
    }

    /**
     * Deletes expired <ins> and <del> tags from configured database fields.
     */
    public function handleMarkupsCommand() {

        $this->initialize();

        foreach ($this->settings['markupFields'] as $tablename => $fieldsCommaSeparated) {
            $fields = explode(",", str_replace(" ", "", $fieldsCommaSeparated));
            $recordsWithMarkups = $this->findRecordWithMarkups($tablename, $fields);
            foreach($recordsWithMarkups as $uid => $recordWithMarkups) {
                foreach($recordWithMarkups as $fieldName => $fieldContent) {
                    $this->removeExpiredMarkups($fieldContent);
                }
            }
        }

        $dataHandler = $this->objectManager->get(\TYPO3\CMS\Core\DataHandling\DataHandler::class);
    }

    protected function removeExpiredMarkups($text) {
        $tagNames = array("ins", "del");
        foreach($tagNames as $tagName) {
            $startTagStartPos = 0;
            do {
                $startTagStartPos = strpos($text, "<" . $tagName, $startTagStartPos);
                if ($startTagStartPos !== false) {
                    $startTagEndPos = strpos($text, ">", $startTagStartPos) + 1;
                    if ($startTagEndPos !== false) {
                        /* We found a tag. */
                        $startTag = substr($text, $startTagStartPos, $startTagEndPos - $startTagStartPos);

                        /* Extract the attributes. */
                        $matches = array();
                        $preg = "/(\\S+)=[\"']?((?:.(?![\"']?\\s+(?:\\S+)=|[>\"']))+.)[\"']?/";
                        preg_match_all($preg, $startTag, $matches);

                        /* Get the date attribute */
                        $dataTimestampIndex = -1;
                        for ($i = 0; $i < count($matches[1]); $i++) {
                            if ($matches[1][$i] == "data-timestamp") {
                                $dataTimestampIndex = $i;
                                break;
                            }
                        }

                        /* Convert text date to timestamp. */
                        $date = \DateTime::createFromFormat("d.m.Y H:i", $matches[2][$dataTimestampIndex]);
                        $date->setTime(0, 0, 0);
                        $tstamp = $date->getTimestamp();

                        if ($tstamp < strtotime("-" . $this->settings['maxMarkupAge'] . " day")) {
                            /* If the tag is expired, remove it. */
                            $endTagStartPos = strpos($text, "</" . $tagName, $startTagEndPos);
                            if ($endTagStartPos !== false) {
                                $endTagEndPos = $endTagStartPos + strlen("</" . $tagName . ">");
                                $text = substr($text, 0, $endTagStartPos)
                                    . substr($text, $endTagEndPos, strlen($text) - $endTagEndPos);

                                $text = substr($text, 0, $startTagStartPos)
                                    . substr($text, $startTagEndPos, strlen($text) - $startTagEndPos);
                            }
                        } else {
                            /* If tag is not expired, continue search for further tags after the current tag. */
                            $startTagStartPos = $startTagEndPos;
                        }
                    }
                }
            } while ($startTagStartPos !== false);
        }
        return $text;
    }

    protected function findRecordWithMarkups($tablename, $fields) {
        if (count($fields) == 0) {
            return null;
        }
        $queryFields = "uid,".implode(",", $fields);
        $where = array();
        $tempOr = array();
        foreach ($fields as $field) {
            $tempOr[] = $field." LIKE '%<ins%'";
            $tempOr[] = $field." LIKE '%<del%'";
        }
        $where[] = "(".implode(" OR ", $tempOr).")";
        $results = $GLOBALS['TYPO3_DB']->exec_SELECTgetRows($queryFields, $tablename, implode(" AND ", $where));
        $resultsForReturn = array();
        foreach($results as &$result) {
            $uid = $result['uid'];
            unset($result['uid']);
            $resultsForReturn[$uid] = $result;
        }
        return $resultsForReturn;
    }
}