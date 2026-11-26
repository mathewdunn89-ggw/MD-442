cmake_minimum_required(VERSION 3.22)
project(MD442_PLUGIN VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_OSX_DEPLOYMENT_TARGET "10.13" CACHE STRING "")

# JUCE: use a local checkout if given (-DJUCE_DIR=...), else fetch the pinned tag
if (DEFINED JUCE_DIR)
    add_subdirectory(${JUCE_DIR} juce)
else()
    include(FetchContent)
    FetchContent_Declare(JUCE GIT_REPOSITORY https://github.com/juce-framework/JUCE.git GIT_TAG 8.0.12 GIT_SHALLOW TRUE)
    FetchContent_MakeAvailable(JUCE)
endif()

set(MD442_FORMATS VST3 Standalone)
if (APPLE)
    list(APPEND MD442_FORMATS AU)
endif()

juce_add_plugin(MD442
    COMPANY_NAME "NEST Group"
    COMPANY_WEBSITE "https://music.nestgroup.space/md442/"
    BUNDLE_ID "space.nestgroup.md442"
    PLUGIN_MANUFACTURER_CODE Nest
    PLUGIN_CODE Md44
    PRODUCT_NAME "MD-442"
    DESCRIPTION "MD|442 drum machine"
    IS_SYNTH TRUE
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    VST3_CATEGORIES Instrument Drum
    AU_MAIN_TYPE kAudioUnitType_MusicDevice
    COPY_PLUGIN_AFTER_BUILD FALSE
    HARDENED_RUNTIME_ENABLED FALSE
    MICROPHONE_PERMISSION_ENABLED FALSE
    FORMATS ${MD442_FORMATS})

# the MD187 and MD888 break loops, built into the plugin
juce_add_binary_data(MD442Samples SOURCES
    styles/samples/md187/BOOMBP.wav styles/samples/md187/DRUMS.wav styles/samples/md187/STABS.wav styles/samples/md187/VOX.wav
    styles/samples/md888/RUMBLE.wav styles/samples/md888/GABBA.wav styles/samples/md888/TRANCE.wav styles/samples/md888/HITS.wav)

target_sources(MD442 PRIVATE
    src/Engine.cpp
    src/PluginProcessor.cpp
    src/PluginEditor.cpp
    src/BeatIO.cpp)

target_compile_definitions(MD442 PUBLIC
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
    JUCE_DISPLAY_SPLASH_SCREEN=0)

target_link_libraries(MD442 PRIVATE
    MD442Samples
    juce::juce_audio_utils
    juce::juce_dsp
    PUBLIC
    juce::juce_recommended_config_flags
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warning_flags)

# offline render, used to check the sound against the web engine
add_executable(md442_render tools/render.cpp src/Engine.cpp)
find_package(Threads REQUIRED)
target_link_libraries(md442_render PRIVATE Threads::Threads)
target_compile_definitions(md442_render PRIVATE MD442_STYLES_DIR="${CMAKE_CURRENT_SOURCE_DIR}/styles")
