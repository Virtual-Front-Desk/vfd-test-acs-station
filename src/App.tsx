import { useMemo, useState } from "react";
import { getAcsAuth } from "./api";
import {
  CallAgentProvider,
  CallClientProvider,
  CallProvider,
  FluentThemeProvider,
  StatefulCallClient,
  createStatefulCallClient,
} from "@azure/communication-react";
import {
  Call,
  CallAgent,
  LocalVideoStream,
} from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import VideoCallComponent from "./components/VideoCallComponent";

function App() {
  const [callerId, setCallerId] = useState<string>("");
  const [callerToken, setCallerToken] = useState<string>("");
  const [selectedCamera, setSelectedCamera] = useState<string>("");

  const [statefulCallClient, setStatefulCallClient] =
    useState<StatefulCallClient | null>(null);
  const [callAgent, setCallAgent] = useState<CallAgent | null>(null);
  const [call, setCall] = useState<Call | null>(null);

  const tokenCredential = useMemo(() => {
    if (!callerToken) return null;
    return new AzureCommunicationTokenCredential(callerToken);
  }, [callerToken]);

  const handleSetCall = async (
    statefulCallClient: StatefulCallClient,
    selectedCamera: string,
    callAgent: CallAgent
  ) => {
    const deviceManager = await statefulCallClient.getDeviceManager();
    const cameras = await deviceManager.getCameras();

    const camera = cameras.find((camera) => camera.name === selectedCamera);

    const localVideoStream2 = new LocalVideoStream(camera!);

    setCall(
      callAgent.join(
        {
          meetingLink:
            "https://teams.microsoft.com/l/meetup-join/19%3ameeting_MDcwYjIxMGMtM2ZjYS00ZTM3LWI5NzQtYmEzOWFhYmY2MWY2%40thread.v2/0?context=%7b%22Tid%22%3a%22bb1c47f2-f592-4c4e-b84b-f59f8511d17c%22%2c%22Oid%22%3a%222553e2ae-8206-4064-9bc3-d3ae9ef8f001%22%7d",
        },
        {
          videoOptions: localVideoStream2
            ? {
                localVideoStreams: [localVideoStream2],
              }
            : undefined,
        }
      )
    );
  };

  const handleSelectCameraAndMicrophone = async (
    statefulCallClient: StatefulCallClient,
    callAgent: CallAgent
  ) => {
    const deviceManager = await statefulCallClient.getDeviceManager();
    const cameras = await deviceManager.getCameras();
    const microphones = await deviceManager.getMicrophones();

    if (cameras.length === 0 || microphones.length === 0 || !selectedCamera) {
      const permission = await deviceManager.askDevicePermission({
        audio: true,
        video: true,
      });

      if (permission && permission.audio && permission.video) {
        const newCameras = await deviceManager.getCameras();
        const newMicrophones = await deviceManager.getMicrophones();

        if (newCameras.length === 0 || newMicrophones.length === 0) {
          alert("No camera or microphone found");
          window.location.reload();
        }

        if (newCameras.length > 0) {
          setSelectedCamera(newCameras[0].name);

          handleSetCall(statefulCallClient, newCameras[0].name, callAgent);
        }
      } else {
        alert("Permission denied");
        window.location.reload();
      }
    } else {
      if (cameras.length > 0) {
        setSelectedCamera(cameras[0].name);

        handleSetCall(statefulCallClient, cameras[0].name, callAgent);
      }
    }
  };

  const handleSetCallClient = async () => {
    if (!tokenCredential) return;

    const statefulCallClient = createStatefulCallClient({
      userId: { communicationUserId: callerId },
    });

    const callAgent = await statefulCallClient.createCallAgent(
      tokenCredential,
      {
        displayName: "Dashboard",
      }
    );

    setStatefulCallClient(statefulCallClient);

    setCallAgent(callAgent);

    handleSelectCameraAndMicrophone(statefulCallClient, callAgent);
  };

  const handleJoinCall = async () => {
    const acsAuth = await getAcsAuth("test_auth");

    if (acsAuth.userId && acsAuth.token) {
      setCallerId(acsAuth.userId);
      setCallerToken(acsAuth.token);
    }

    handleSetCallClient();
  };

  return (
    <>
      <h1 className="text-center mt-10 text-2xl font-bold">
        Test ACS call quality - Station side
      </h1>
      <div className="w-full flex justify-center items-center mt-16">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleJoinCall}
        >
          Join call
        </button>

        {callerId && callerToken && statefulCallClient && callAgent && call && (
          <FluentThemeProvider>
            <CallClientProvider callClient={statefulCallClient}>
              <CallAgentProvider callAgent={callAgent}>
                <CallProvider call={call}>
                  <VideoCallComponent />
                </CallProvider>
              </CallAgentProvider>
            </CallClientProvider>
          </FluentThemeProvider>
        )}
      </div>
    </>
  );
}

export default App;
