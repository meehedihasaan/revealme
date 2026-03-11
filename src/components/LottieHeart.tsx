import Lottie from "lottie-react";
import heartAnimation from "@/assets/heart-animation.json";

const LottieHeart = () => (
  <Lottie animationData={heartAnimation} loop={false} autoplay style={{ width: 200, height: 200 }} />
);

export default LottieHeart;
