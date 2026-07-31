/**

 * واجهة خروج RuntimeAssembly — مفصولة لتوضيح العقد وتقليل حجم ملف التجميع.

 */

import type { ExecutionDashboardChunkHostProps } from '../../components/ExecutionDashboardChunkHost';

import type { ExecutionToastProps } from '../../components/ExecutionToast';



export type ExecutionDashboardRuntimeAssemblyResult = {

    toastVisible: ExecutionToastProps['visible'];

    toastMessage: ExecutionToastProps['message'];

    toastType: ExecutionToastProps['type'];

    toastEpoch: ExecutionToastProps['epoch'];

    hideToast: ExecutionToastProps['onClose'];

} & ExecutionDashboardChunkHostProps;



export function buildExecutionDashboardRuntimeAssemblyResult(

    input: ExecutionDashboardRuntimeAssemblyResult,

): ExecutionDashboardRuntimeAssemblyResult {

    return input;

}

