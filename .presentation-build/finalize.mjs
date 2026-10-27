import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { finalizePresentation } from '/Users/thinleydema/.codex/plugins/cache/openai-primary-runtime/presentations/26.1025.11240/skills/presentations/container_tools/artifact_tool_utils.mjs';
const workspaceDir='/Users/thinleydema/Desktop/Crop_disease';
const SKILL_DIR='/Users/thinleydema/.codex/plugins/cache/openai-primary-runtime/presentations/26.1025.11240/skills/presentations';
const result=await finalizePresentation({
 workspaceDir,
 candidatePath:path.join(workspaceDir,'output/Yoesar-Prototype-Presentation-v2.pptx'),
 finalPath:path.join(workspaceDir,'output/Yoesar-Prototype-Presentation-Final-v2.pptx'),
 pythonExecutable:'/Users/thinleydema/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',
 integrityValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],
 explicitTotalSlideCount:12,
 requiredNativeTableOwnerSlides:[],
 requiredNativeChartOwnerSlides:[],
 fontPolicy:{basis:'design',families:['Aptos']},
 verifyArtifactToolImport:true,
 receiptPath:path.join(workspaceDir,'.presentation-build/Yoesar-Prototype-Presentation-v2.validation.json')
});
console.log(JSON.stringify(result));
