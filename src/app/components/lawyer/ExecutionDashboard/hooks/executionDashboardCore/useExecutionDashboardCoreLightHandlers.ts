// @ts-nocheck
/** notes / appointment / payment — مُثبّتة على Core دون انتظار lazy light cluster */
import { useExecutionDashboardCoreHandlerClusterLight } from './useExecutionDashboardCoreHandlerClusterLight';
import {
    buildExecutionDashboardCoreLightHandlerClusterInput,
    type ExecutionDashboardCoreLightHandlersParams,
} from './buildExecutionDashboardCoreLightHandlerClusterInput';

export function useExecutionDashboardCoreLightHandlers(p: ExecutionDashboardCoreLightHandlersParams) {
    return useExecutionDashboardCoreHandlerClusterLight(
        buildExecutionDashboardCoreLightHandlerClusterInput(p),
    );
}
