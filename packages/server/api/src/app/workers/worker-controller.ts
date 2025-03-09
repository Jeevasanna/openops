import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  DeleteWebhookSimulationRequest,
  JobData,
  OneTimeJobData,
  PollJobRequest,
  QueueName,
  rejectedPromiseHandler,
  ResumeRunRequest,
  SavePayloadRequest,
  ScheduledJobData,
  SendWebhookUpdateRequest,
  SubmitPayloadsRequest,
  WebhookJobData,
} from '@openops/server-shared';
import {
  ExecutionType,
  openOpsId,
  PrincipalType,
  ProgressUpdateType,
  RunEnvironment,
} from '@openops/shared';
import { accessTokenManager } from '../authentication/lib/access-token-manager';
import { flowRunService } from '../flows/flow-run/flow-run-service';
import { flowService } from '../flows/flow/flow.service';
import { triggerEventService } from '../flows/trigger-events/trigger-event.service';
import { dedupeService } from '../flows/trigger/dedupe';
import { webhookSimulationService } from '../webhooks/webhook-simulation/webhook-simulation-service';
import { flowConsumer } from './consumer';
import { webhookResponseWatcher } from './helper/webhook-response-watcher';

export const flowWorkerController: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/poll',
    {
      config: {
        allowedPrincipals: [PrincipalType.WORKER],
      },
      logLevel: 'silent',
      schema: {
        querystring: PollJobRequest,
      },
    },
    async (request) => {
      const token = openOpsId();
      const { queueName } = request.query;
      const job = await flowConsumer.poll(queueName, {
        token,
      });
      if (!job) {
        return null;
      }
      return enrichEngineToken(token, queueName, job);
    },
  );

  app.post(
    '/delete-webhook-simulation',
    {
      config: {
        allowedPrincipals: [PrincipalType.WORKER],
      },
      schema: {
        body: DeleteWebhookSimulationRequest,
      },
    },
    async (request) => {
      const { flowId, projectId } = request.body;
      await webhookSimulationService.delete({ flowId, projectId });
    },
  );

  app.post(
    '/send-webhook-update',
    {
      config: {
        allowedPrincipals: [PrincipalType.WORKER],
      },
      schema: {
        body: SendWebhookUpdateRequest,
      },
    },
    async (request) => {
      const { workerServerId, executionCorrelationId, response } = request.body;
      await webhookResponseWatcher.publish(
        executionCorrelationId,
        workerServerId,
        response,
      );
      return {};
    },
  );

  app.post(
    '/save-payloads',
    {
      config: {
        allowedPrincipals: [PrincipalType.WORKER],
      },
      schema: {
        body: SavePayloadRequest,
      },
    },
    async (request) => {
      const { flowId, projectId, payloads } = request.body;
      const savePayloads = payloads.map((payload) =>
        rejectedPromiseHandler(
          triggerEventService.saveEvent({
            flowId,
            payload,
            projectId,
          }),
        ),
      );
      rejectedPromiseHandler(Promise.all(savePayloads));
      return {};
    },
  );

  app.post(
    '/submit-payloads',
    {
      config: {
        allowedPrincipals: [PrincipalType.WORKER],
      },
      schema: {
        body: SubmitPayloadsRequest,
      },
    },
    async (request) => {
      const {
        flowVersionId,
        projectId,
        payloads,
        executionCorrelationId,
        synchronousHandlerId,
        progressUpdateType,
      } = request.body;

      const filterPayloads = await dedupeService.filterUniquePayloads(
        flowVersionId,
        payloads,
      );
      const createFlowRuns = filterPayloads.map((payload) =>
        flowRunService.start({
          environment: RunEnvironment.PRODUCTION,
          flowVersionId,
          payload,
          synchronousHandlerId,
          projectId,
          executionCorrelationId,
          executionType: ExecutionType.BEGIN,
          progressUpdateType,
        }),
      );
      return Promise.all(createFlowRuns);
    },
  );

  app.post(
    '/resume-run',
    {
      config: {
        allowedPrincipals: [PrincipalType.WORKER],
      },
      schema: {
        body: ResumeRunRequest,
      },
    },
    async (request) => {
      const data = request.body;
      await flowRunService.start({
        payload: null,
        flowRunId: data.runId,
        synchronousHandlerId: data.synchronousHandlerId ?? undefined,
        projectId: data.projectId,
        flowVersionId: data.flowVersionId,
        executionType: ExecutionType.RESUME,
        executionCorrelationId: data.executionCorrelationId,
        environment: RunEnvironment.PRODUCTION,
        progressUpdateType: data.progressUpdateType ?? ProgressUpdateType.NONE,
      });
    },
  );
};

async function enrichEngineToken(
  token: string,
  queueName: QueueName,
  job: { id: string; data: JobData },
) {
  const engineToken = await accessTokenManager.generateEngineToken({
    executionCorrelationId: job.id,
    queueToken: token,
    projectId: await getProjectId(queueName, job.data),
  });
  return {
    data: job.data,
    id: job.id,
    engineToken,
  };
}

async function getProjectId(queueName: QueueName, job: JobData) {
  switch (queueName) {
    case QueueName.ONE_TIME:
      return (job as OneTimeJobData).projectId;
    case QueueName.WEBHOOK: {
      // TODO add project it to the webhook data
      const webhookData = job as WebhookJobData;
      const flow = await flowService.getOneById(webhookData.flowId);
      return flow?.projectId ?? openOpsId();
    }
    case QueueName.SCHEDULED:
      return (job as ScheduledJobData).projectId;
  }
}
