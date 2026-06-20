import bg from "../assets/guideBg.png";
import PurikuraButton from "../components/PikuraButton";
import txt3 from "../assets/btnText3.png";
import FullScreenBackground from "../components/FullScreenBackground";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

function MikuraGuide() {
  const navigate = useNavigate();
  return (
    <FullScreenBackground background={bg}>
      <CameraButton img={txt3} onClick={() => navigate("/camera")} />
    </FullScreenBackground>
  );
}

export default MikuraGuide;

const CameraButton = styled(PurikuraButton)`
  bottom: 17%;
  left: 50%;
  width: clamp(300px, 29vw, 520px);
  height: clamp(88px, 9vh, 108px);
  border: none;
  --button-transform: translateX(-50%);

  & > img {
    width: 60%;
  }
`;
