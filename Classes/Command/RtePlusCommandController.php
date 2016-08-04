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

    protected static $TAG_INS = "ins";
    protected static $TAG_DEL = "del";

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
     * @var \TYPO3\CMS\Core\DataHandling\DataHandler
     */
    protected $dataHandler = null;

    /**
     * @var \TYPO3\CMS\Core\Authentication\BackendUserAuthentication
     */
    protected $beUser = null;

    /**
     * Initialize the controller.
     */
    protected function initialize() {

        $this->settings = $this->configurationManager->getConfiguration(
            \TYPO3\CMS\Extbase\Configuration\ConfigurationManagerInterface::CONFIGURATION_TYPE_SETTINGS,
            'RtePlus', 'RtePlus'
        );

        $this->dataHandler = $this->objectManager->get(\TYPO3\CMS\Core\DataHandling\DataHandler::class);
        $this->dataHandler->start(null, null, $GLOBALS['BE_USER']);

        if (is_numeric($this->settings['beUserUid']) && $this->settings['beUserUid'] > 0) {
            $this->beUser = \TYPO3\CMS\Core\Utility\GeneralUtility::makeInstance(\TYPO3\CMS\Core\Authentication\BackendUserAuthentication::class);
            $this->beUser->OS = TYPO3_OS;
            $this->beUser->setBeUserByUid($this->settings['beUserUid']);
            $this->beUser->fetchGroupData();
            $this->beUser->backendSetUC();
        }
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
                    $removedMarkup = false; // Gets set to true by removeExpiredMarkups(...), if at least one markup was removed.
                    $newContent = $this->removeExpiredMarkups($fieldContent, $removedMarkup);
                    if ($removedMarkup) {
                        if ($this->beUser !== null) {
                            $data[$tablename][$uid][$fieldName] = $newContent;
                            $this->dataHandler->start($data, null, $this->beUser);
                            $this->dataHandler->process_datamap();
                        } else {
                            $this->dataHandler->updateDB($tablename, $uid, array($fieldName => $newContent));
                        }
                    }
                }
            }
        }
    }

    /**
     * Removes expired ins or del tags from given text.
     *
     * @param $text
     * @param $removedMarkup Will be set to true, if at least one markup was removed.
     * @return string
     */
    protected function removeExpiredMarkups($text, &$removedMarkup) {
        $tagNames = array(self::$TAG_INS, self::$TAG_DEL);
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
                        try {
                            $date = \DateTime::createFromFormat("d.m.Y H:i", $matches[2][$dataTimestampIndex]);
                            $date->setTime(0, 0, 0);
                            $tstamp = $date->getTimestamp();
                        } catch(\Exception $ex) {
                            $startTagStartPos++;
                            continue;
                        }

                        if ($tstamp < strtotime("-" . $this->settings['maxMarkupAge'] . " day")) {
                            /* If the tag is expired, remove it. */
                            $removedMarkup = true;
                            $endTagStartPos = strpos($text, "</" . $tagName, $startTagEndPos);
                            if ($endTagStartPos !== false) {
                                $endTagEndPos = $endTagStartPos + strlen("</" . $tagName . ">");
                                if ($tagName == self::$TAG_INS) {
                                    /* If it's the insert tag, just remove the tag. */
                                    $text = substr($text, 0, $endTagStartPos)
                                        . substr($text, $endTagEndPos, strlen($text) - $endTagEndPos);
                                    $text = substr($text, 0, $startTagStartPos)
                                        . substr($text, $startTagEndPos, strlen($text) - $startTagEndPos);
                                } else if ($tagName == self::$TAG_DEL) {
                                    /* If it's the delete tag, remove the tag and its content. */

                                    $lineBreak = "\r\n";
                                    $lineBreakLength = strlen($lineBreak);

                                    /* Get the chars before the start tag. */
                                    $charsBeforeStartTag = "";
                                    if ($startTagStartPos >= $lineBreakLength) { // Check bounds.
                                        $charsBeforeStartTag = substr($text, $startTagStartPos - $lineBreakLength, $lineBreakLength);
                                    }

                                    /* Get the chars after the end tag. */
                                    $charsAfterEndTag = "";
                                    if ($endTagEndPos + $lineBreakLength < strlen($text)) { // Check bounds.
                                        $charsAfterEndTag = substr($text, $endTagEndPos , $lineBreakLength);
                                    }

                                    if (($charsBeforeStartTag == $lineBreak || $startTagStartPos === 0) && $charsAfterEndTag == $lineBreak) {
                                        /* If the tag contains a complete paragraph, we want to delete the paragraph (represented via "\r\n"), too. */
                                        $endTagEndPos = $endTagEndPos + $lineBreakLength;
                                    }

                                    $text = substr($text, 0, $startTagStartPos)
                                        . substr($text, $endTagEndPos, strlen($text) - $endTagEndPos);
                                }
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

    /**
     * Gets DB records in given table that vontain at least one "<ins" or "<del".
     *
     * @param $tablename Tablename
     * @param $fields Array of fields.
     * @return array
     */
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