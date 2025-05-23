import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
  UNSAVED_CHANGES_TOAST,
  useCanvasContext,
  usePasteActionsInClipboard,
  WorkflowNode,
} from '@openops/components/ui';
import {
  Action,
  ActionType,
  FlagId,
  FlowOperationType,
  StepLocationRelativeToParent,
} from '@openops/shared';

import { t } from 'i18next';
import {
  ArrowRightLeft,
  Copy,
  CopyPlus,
  EllipsisVertical,
  Trash,
} from 'lucide-react';
import { memo } from 'react';
import { useBuilderStateContext } from '../../builder-hooks';
import { useApplyOperationAndPushToHistory } from '../../flow-version-undo-redo/hooks/apply-operation-and-push-to-history';
import { usePaste } from '../../hooks/use-paste';
import { StepActionWrapper } from '../nodes/step-action-wrapper';

type Props = {
  data: WorkflowNode['data'];
  isAction: boolean;
  openStepActionsMenu: boolean;
  setOpenStepActionsMenu: (openStepActionsMenu: boolean) => void;
  setOpenBlockSelector: (openBlockSelector: boolean) => void;
};

const CanvasContextMenu = memo(
  ({
    data,
    isAction,
    openStepActionsMenu,
    setOpenStepActionsMenu,
    setOpenBlockSelector,
  }: Props) => {
    const showCopyPaste =
      flagsHooks.useFlag<boolean>(FlagId.COPY_PASTE_ACTIONS_ENABLED).data ||
      false;
    const applyOperationAndPushToHistory = useApplyOperationAndPushToHistory();

    const { copyAction } = useCanvasContext();
    const { onPaste } = usePaste();
    const { actionToPaste, fetchClipboardOperations } =
      usePasteActionsInClipboard();

    const [selectStepByName, removeStepSelection, setAllowCanvasPanning] =
      useBuilderStateContext((state) => [
        state.selectStepByName,
        state.removeStepSelection,
        state.setAllowCanvasPanning,
      ]);

    const deleteStep = () => {
      if (!data.step) {
        return;
      }
      applyOperationAndPushToHistory(
        {
          type: FlowOperationType.DELETE_ACTION,
          request: {
            name: data.step.name,
          },
        },
        () => toast(UNSAVED_CHANGES_TOAST),
      );
      removeStepSelection();
    };

    const duplicateStep = () => {
      if (!data.step) {
        return;
      }
      return applyOperationAndPushToHistory(
        {
          type: FlowOperationType.DUPLICATE_ACTION,
          request: {
            stepName: data.step.name,
          },
        },
        () => toast(UNSAVED_CHANGES_TOAST),
      );
    };

    return (
      <DropdownMenu
        open={openStepActionsMenu}
        onOpenChange={async (open) => {
          await fetchClipboardOperations();
          setOpenStepActionsMenu(open);
          if (open && data.step) {
            selectStepByName(data.step.name);
          }
        }}
        modal={true}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 size-6"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <EllipsisVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-44 absolute"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              e.stopPropagation();

              setOpenStepActionsMenu(false);
              setOpenBlockSelector(true);

              if (data.step) {
                selectStepByName(data.step.name);
              }
            }}
          >
            <StepActionWrapper>
              <ArrowRightLeft className=" h-4 w-4 " />
              <span>{t('Replace')} </span>
            </StepActionWrapper>
          </DropdownMenuItem>

          {isAction && showCopyPaste && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  copyAction(data.step as Action);
                }}
              >
                <StepActionWrapper>
                  <Copy className="mr-2 h-4 w-4" />
                  <span className="">{t('Copy')}</span>
                </StepActionWrapper>
              </DropdownMenuItem>
            </>
          )}

          {isAction && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                duplicateStep();
                setOpenStepActionsMenu(false);
              }}
            >
              <StepActionWrapper>
                <CopyPlus className="h-4 w-4" />
                {t('Duplicate')}
              </StepActionWrapper>
            </DropdownMenuItem>
          )}

          {isAction &&
            showCopyPaste &&
            actionToPaste &&
            data.step?.type === ActionType.LOOP_ON_ITEMS && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  if (data.step) {
                    onPaste(
                      actionToPaste as Action,
                      StepLocationRelativeToParent.INSIDE_LOOP,
                      data.step.name,
                    );
                  }
                }}
              >
                <StepActionWrapper>
                  <Copy className="mr-2 h-4 w-4" />
                  <span className=""> {t('Paste inside Loop')}</span>
                </StepActionWrapper>
              </DropdownMenuItem>
            )}

          {isAction &&
            showCopyPaste &&
            actionToPaste &&
            data.step?.type === ActionType.BRANCH && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  if (data.step) {
                    onPaste(
                      actionToPaste as Action,
                      StepLocationRelativeToParent.INSIDE_TRUE_BRANCH,
                      data.step.name,
                    );
                  }
                }}
              >
                <StepActionWrapper>
                  <Copy className="mr-2 h-4 w-4" />
                  <span className=""> {t('Paste inside first branch')}</span>
                </StepActionWrapper>
              </DropdownMenuItem>
            )}

          {isAction &&
            showCopyPaste &&
            actionToPaste &&
            data.step?.type === ActionType.SPLIT && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  if (data.step) {
                    const branchNodeId = data.step.settings.options[0].id;
                    onPaste(
                      actionToPaste as Action,
                      StepLocationRelativeToParent.INSIDE_SPLIT,
                      data.step.name,
                      branchNodeId,
                    );
                  }
                }}
              >
                <StepActionWrapper>
                  <Copy className="mr-2 h-4 w-4" />
                  <span className="">{t('Paste inside default branch')}</span>
                </StepActionWrapper>
              </DropdownMenuItem>
            )}

          {isAction && showCopyPaste && actionToPaste && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  if (data.step) {
                    onPaste(
                      actionToPaste as Action,
                      StepLocationRelativeToParent.AFTER,
                      data.step.name,
                    );
                  }
                }}
              >
                <StepActionWrapper>
                  <Copy className="mr-2 h-4 w-4" />
                  <span className="">{t('Paste after')}</span>
                </StepActionWrapper>
              </DropdownMenuItem>
            </>
          )}

          {isAction && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  deleteStep();
                  setOpenStepActionsMenu(false);
                  setAllowCanvasPanning(true);
                }}
              >
                <StepActionWrapper>
                  <Trash className="mr-2 h-4 w-4 text-destructive" />
                  <span className="text-destructive">{t('Delete')}</span>
                </StepActionWrapper>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
);

CanvasContextMenu.displayName = 'CanvasContextMenu';
export { CanvasContextMenu };
